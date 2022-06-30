import * as aws from '@pulumi/aws';
import * as awsx from '@pulumi/awsx';
import * as pulumi from '@pulumi/pulumi';

type EbsVolumeType = 'gp2' | 'gp3' | 'io1' | 'io2';

interface IEbsBlockDeviceConfig {
  VolumeSpecification: { SizeInGB: number; VolumeType: EbsVolumeType }[];
  VolumesPerInstance: number;
}

interface IEbsConfiguration {
  EbsBlockDeviceConfigs: IEbsBlockDeviceConfig[];
  EbsOptimized: boolean;
}

interface IInstanceGroup {
  EbsConfiguration: IEbsConfiguration[];
  InstanceCount: number;
  InstanceGroupType: 'TASK' | 'MASTER' | 'CORE';
  InstanceType: string;
  Name: string;
}

interface IEmrSettings {
  ebsRootVolumeSize: number;
  instanceGroups: IInstanceGroup[];
  osReleaseLabel: string;
  releaseLabel: string;
  scaleDownBehavior: string;
}

export const configureEmrCluster = (
  env: string,
  vpc: awsx.ec2.Vpc,
  rds: aws.rds.Instance
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
    ebsRootVolumeSize = 30,
    instanceGroups,
    osReleaseLabel,
    releaseLabel,
    scaleDownBehavior = 'TERMINATE_AT_TASK_COMPLETION'
  } = config.requireObject<IEmrSettings>('emr');

  const emrClusterName = `app-mpdw-emr-${env}`;

  const emr = new aws.emr.Cluster(emrClusterName, {
    tags
  }, { dependsOn: [vpc, rds] });

  return emr;
};
