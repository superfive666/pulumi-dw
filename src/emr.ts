import * as aws from '@pulumi/aws';
import * as pulumi from '@pulumi/pulumi';

import { input } from '@pulumi/aws/types';

interface IEmrSettings {
  applications: string[];
  ebsRootVolumeSize: number;
  osReleaseLabel: string;
  releaseLabel: string;
  scaleDownBehavior: string;
  ldapUserBind?: string;
  coreInstanceGroup: input.emr.ClusterCoreInstanceGroup;
  masterInstanceGroup: input.emr.ClusterMasterInstanceGroup;
  ec2Attributes: input.emr.ClusterEc2Attributes;
}

const pulumiProject = pulumi.getProject();
const stack = pulumi.getStack();
const tags: aws.Tags = {
  'pulumi:Project': pulumiProject,
  'pulumi:Stack': stack,
  Project: 'mpdw',
  purpose: 'emr'
};

export const configureJupyterCluster = (
  env: string,
  rds: aws.rds.Instance,
  log: aws.s3.Bucket,
  s3: aws.s3.Bucket,
  ec2Role: aws.iam.Role,
  emrRole: aws.iam.Role,
  scalingRole: aws.iam.Role
): aws.emr.Cluster => {
  const config = new pulumi.Config();
  const {
    applications,
    scaleDownBehavior = 'TERMINATE_AT_TASK_COMPLETION',
    releaseLabel,
    ebsRootVolumeSize,
    coreInstanceGroup,
    masterInstanceGroup,
    ec2Attributes
  } = config.requireObject<IEmrSettings>('jupyter');

  const emrClusterName = `app-mpdw-emrjpt-${env}`;
  const keyName = `app-mpdw-keypairs-${env}`;
  const password = config.requireSecret('masterPassword');

  const configurationsJson = pulumi
    .output([
      {
        Classification: 'hive-site',
        Properties: {
          'javax.jdo.option.ConnectionURL': pulumi.interpolate`jdbc:mysql://${rds.endpoint}/hive?createDatabaseIfNotExist=true`,
          'javax.jdo.option.ConnectionDriverName': 'org.mariadb.jdbc.Driver',
          'javax.jdo.option.ConnectionUserName': 'root',
          'javax.jdo.option.ConnectionPassword': password,
          'hive.blobstore.use.output-committer': 'true'
        }
      },
      {
        Classification: 'jupyter-s3-conf',
        Properties: {
          's3.persistence.enabled': 'true',
          's3.persistence.bucket': s3.id
        }
      },
      {
        Classification: 'spark-defaults',
        Properties: {
          'spark.dynamicAllocation.enabled': 'false',
          'spark.executor.memory': '1G',
          'spark.driver.memory ': '1G',
          'spark.emr.default.executor.memory': '1G'
        }
      }
    ])
    .apply((v) => JSON.stringify(v));

  const profileName = `app-mpdw-prf-${env}-emrjpt`;
  const instanceProfile = new aws.iam.InstanceProfile(profileName, {
    name: profileName,
    role: ec2Role,
    tags
  });

  const emr = new aws.emr.Cluster(
    emrClusterName,
    {
      name: emrClusterName,

      // EMR config
      applications,
      releaseLabel,
      serviceRole: emrRole.name,
      autoscalingRole: scalingRole.name,
      terminationProtection: false,
      scaleDownBehavior,
      configurationsJson,
      logUri: pulumi.interpolate`s3://${log.id}/${emrClusterName}/logs`,

      // EC2 nodes
      ebsRootVolumeSize,
      masterInstanceGroup,
      coreInstanceGroup,
      ec2Attributes: {
        ...ec2Attributes,
        keyName,
        instanceProfile: instanceProfile.name
      },

      tags
    },
    {
      dependsOn: [rds, s3, log, instanceProfile],
      ignoreChanges: ['applications', 'configurationsJson', 'logUri']
    }
  );

  new aws.emr.ManagedScalingPolicy(`app-mpdw-scaling-${env}`, {
    clusterId: emr.id,
    computeLimits: [
      {
        unitType: 'Instances',
        minimumCapacityUnits: 1,
        maximumCapacityUnits: 5,
        maximumOndemandCapacityUnits: 2,
        maximumCoreCapacityUnits: 2
      }
    ]
  });

  return emr;
};

export const configureEmrCluster = (
  env: string,
  rds: aws.rds.Instance,
  s3: aws.s3.Bucket,
  ec2Role: aws.iam.Role,
  emrRole: aws.iam.Role
): aws.emr.Cluster => {
  const config = new pulumi.Config();
  const {
    applications,
    scaleDownBehavior = 'TERMINATE_AT_TASK_COMPLETION',
    releaseLabel,
    ebsRootVolumeSize,
    coreInstanceGroup,
    masterInstanceGroup,
    ldapUserBind,
    ec2Attributes
  } = config.requireObject<IEmrSettings>('emr');

  const emrClusterName = `app-mpdw-emr-${env}`;
  const keyName = `app-mpdw-keypairs-${env}`;
  const password = config.requireSecret('masterPassword');

  const configurationsJson = pulumi
    .output([
      {
        Classification: 'hive-site',
        Properties: {
          'javax.jdo.option.ConnectionURL': pulumi.interpolate`jdbc:mysql://${rds.endpoint}/hive?createDatabaseIfNotExist=true`,
          'javax.jdo.option.ConnectionDriverName': 'org.mariadb.jdbc.Driver',
          'javax.jdo.option.ConnectionUserName': 'root',
          'javax.jdo.option.ConnectionPassword': password,
          'hive.blobstore.use.output-committer': 'true'
        }
      },
      {
        Classification: 'spark-defaults',
        Properties: {
          'spark.dynamicAllocation.enabled': 'false',
          'spark.executor.memory': '1G',
          'spark.driver.memory ': '1G',
          'spark.emr.default.executor.memory': '1G'
        }
      },
      {
        Classification: 'trino-config',
        Properties: {
          'http-server.authentication.type': 'PASSWORD'
        }
      },
      {
        Classification: 'trino-password-authenticator',
        Properties: {
          'password-authenticator.name': 'ldap',
          'ldap.url': 'ldaps://bitdeer-inc.com:636',
          'ldap.user-bind-pattern': ldapUserBind
        }
      }
    ])
    .apply((v) => JSON.stringify(v));

  const profileName = `app-mpdw-prf-${env}-emr`;
  const instanceProfile = new aws.iam.InstanceProfile(profileName, {
    name: profileName,
    role: ec2Role,
    tags
  });

  const emr = new aws.emr.Cluster(
    emrClusterName,
    {
      name: emrClusterName,

      // EMR config
      applications,
      releaseLabel,
      serviceRole: emrRole.name,
      terminationProtection: false,
      scaleDownBehavior,
      configurationsJson,
      logUri: pulumi.interpolate`s3://${s3.id}/${emrClusterName}/logs`,

      // EC2 nodes
      ebsRootVolumeSize,
      masterInstanceGroup,
      coreInstanceGroup,
      ec2Attributes: {
        ...ec2Attributes,
        keyName,
        instanceProfile: instanceProfile.name
      },

      tags
    },
    {
      dependsOn: [rds, s3, instanceProfile]
      // ignoreChanges: ['applications', 'configurationsJson', 'logUri']
    }
  );

  return emr;
};
