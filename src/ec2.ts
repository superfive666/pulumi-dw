import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';

import { input } from '@pulumi/aws/types';

interface IEc2Config {
  ami: string;
  instanceType: string;
  userData: string;
  subnetId: string;
  vpcSecurityGroupIds: string[];
}

export const configureEc2Instance = (env: string): aws.ec2.Instance => {
  const pulumiProject = pulumi.getProject();
  const stack = pulumi.getStack();
  const tags: aws.Tags = {
    'pulumi:Project': pulumiProject,
    'pulumi:Stack': stack,
    Project: 'mpdw',
    purpose: 'tableau',
    Name: 'Tableau Server'
  };

  const config = new pulumi.Config();
  const { ami, instanceType, userData, subnetId, vpcSecurityGroupIds } =
    config.requireObject<IEc2Config>('ec2');

  const serverName = `app-mpdw-ec2-${env}`;
  const keyName = `app-mpdw-keypairs-${env}`;

  const ebsBlockDevices: input.ec2.InstanceEbsBlockDevice[] = [
    {
      deviceName: `/dev/sda1`,
      deleteOnTermination: true,
      volumeSize: 500,
      volumeType: 'gp3',
      tags
    }
  ];

  const profileName = `app-mpdw-prf-${env}-ec2`;
  const iamInstanceProfile = new aws.iam.InstanceProfile(profileName, {
    name: profileName,
    role: 'EMR_EC2_DefaultRole',
    tags
  });

  // Pending: AMI, vpc, subnet, volume, user-data
  const server = new aws.ec2.Instance(
    serverName,
    {
      instanceType,
      ami,
      keyName,
      vpcSecurityGroupIds,
      iamInstanceProfile,
      subnetId,
      ebsBlockDevices,
      userData,
      tags
    },
    { dependsOn: [iamInstanceProfile] }
  );

  return server;
};
