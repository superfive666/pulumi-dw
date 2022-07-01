import * as aws from '@pulumi/aws';
import * as pulumi from '@pulumi/pulumi';

import { input } from '@pulumi/aws/types';

interface IEmrSettings {
  applications: string[];
  ebsRootVolumeSize: number;
  osReleaseLabel: string;
  releaseLabel: string;
  scaleDownBehavior: string;
  coreInstanceGroup: input.emr.ClusterCoreInstanceGroup;
  masterInstanceGroup: input.emr.ClusterMasterInstanceGroup;
  ec2Attributes: input.emr.ClusterEc2Attributes;
}

export const configureEmrCluster = (
  env: string,
  iam: aws.iam.Role,
  rds: aws.rds.Instance,
  s3: aws.s3.Bucket
): aws.emr.Cluster => {
  const config = new pulumi.Config();
  const pulumiProject = pulumi.getProject();
  const stack = pulumi.getStack();
  const timestamp = new Date().toISOString();
  const tags: aws.Tags = {
    'pulumi:Project': pulumiProject,
    'pulumi:Stack': stack,
    Project: 'mpdw',
    purpose: 'emr',
    timestamp
  };
  const {
    applications,
    scaleDownBehavior = 'TERMINATE_AT_TASK_COMPLETION',
    releaseLabel,
    ebsRootVolumeSize,
    coreInstanceGroup,
    masterInstanceGroup,
    ec2Attributes
  } = config.requireObject<IEmrSettings>('emr');

  const emrClusterName = `app-mpdw-emr-${env}`;
  const keyName = `app-mpdw-keypairs-${env}`;
  const password = config.requireSecret('hivePassword');
  const instanceProfile = iam.name;
  const configurationsJson = JSON.stringify({
    Classification: 'hive-site',
    Properties: {
      'javax.jdo.option.ConnectionURL': `jdbc:mysql://${rds.endpoint}/hive?createDatabaseIfNotExist=true`,
      'javax.jdo.option.ConnectionDriverName': 'org.mariadb.jdbc.Driver',
      'javax.jdo.option.ConnectionUserName': 'hive',
      'javax.jdo.option.ConnectionPassword': pulumi.interpolate`${password}`,
      'hive.blobstore.use.output-committer': 'true'
    }
  });

  const emr = new aws.emr.Cluster(
    emrClusterName,
    {
      // EMR config
      applications,
      releaseLabel,
      serviceRole: instanceProfile,
      scaleDownBehavior,
      configurationsJson,
      logUri: `s3://${s3.id}/${emrClusterName}/logs`,

      // EC2 nodes
      ebsRootVolumeSize,
      masterInstanceGroup,
      coreInstanceGroup,
      ec2Attributes: {
        ...ec2Attributes,
        keyName,
        instanceProfile
      },

      tags
    },
    { dependsOn: [rds, iam, s3] }
  );

  return emr;
};
