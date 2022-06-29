import * as pulumi from '@pulumi/pulumi';
import * as awsx from '@pulumi/awsx';
import * as aws from '@pulumi/aws';

import { input } from '@pulumi/aws/types';

interface IEc2Config {
  ami: string;
  instanceType: string;
  userData: string;
}

export const configureEc2Instance = async (
  env: string,
  vpc: awsx.ec2.Vpc,
  sg: aws.ec2.SecurityGroup,
  iam: aws.iam.Role
): Promise<aws.ec2.Instance> => {
  const pulumiProject = pulumi.getProject();
  const stack = pulumi.getStack();
  const timestamp = new Date().toISOString();
  const tags: aws.Tags = {
    'pulumi:Project': pulumiProject,
    'pulumi:Stack': stack,
    Project: 'mpdw',
    purpose: 'tableau',
    timestamp
  };

  const config = new pulumi.Config();
  const { ami, instanceType, userData } = config.requireObject<IEc2Config>('ec2');

  const serverName = `app-mpdw-ec2-${env}`;
  const keyName = `app-mpdw-keypairs-${env}`;
  const subnet = (await vpc.getSubnets('public'))?.[0];
  const subnetId = subnet.id;

  const ebsBlockDevices: input.ec2.InstanceEbsBlockDevice[] = [{
    deviceName: `app-mpdw-ebs-${env}-tableau`,
    volumeSize: 40,
    volumeType: 'gp3',
    tags,
  }];

  // Pending: AMI, vpc, subnet, volume, user-data
  const server = new aws.ec2.Instance(
    serverName,
    {
      instanceType,
      ami,
      keyName,
      vpcSecurityGroupIds: [sg.id],
      iamInstanceProfile: iam.name,
      subnetId,
      ebsBlockDevices,
      userData,
      tags
    },
    { dependsOn: [vpc, sg, iam] }
  );

  return Promise.resolve(server);
};
