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

  const ebsBlockDevices: input.ec2.InstanceEbsBlockDevice[] = [
    {
      deviceName: `/dev/sda1`,
      deleteOnTermination: true,
      volumeSize: 40,
      volumeType: 'gp3',
      tags
    }
  ];

  const profileName = 'APP_MPDW_EC2_INSTANCE_RPOFILE';
  const iamInstanceProfile = new aws.iam.InstanceProfile(
    profileName,
    {
      name: profileName,
      role: iam.name,
      tags
    },
    { dependsOn: [iam] }
  );

  // Pending: AMI, vpc, subnet, volume, user-data
  const server = new aws.ec2.Instance(
    serverName,
    {
      instanceType,
      ami,
      keyName,
      vpcSecurityGroupIds: [sg.id],
      iamInstanceProfile,
      subnetId,
      ebsBlockDevices,
      userData,
      tags
    },
    { dependsOn: [vpc, sg, iam, iamInstanceProfile] }
  );

  return Promise.resolve(server);
};
