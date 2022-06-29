import * as pulumi from '@pulumi/pulumi';
import * as awsx from '@pulumi/awsx';
import * as aws from '@pulumi/aws';

interface IEc2Config {
  instanceType: string;
}

export const configureEc2Instance = (env: string, vpc: awsx.ec2.Vpc): aws.ec2.Instance => {
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
  const { instanceType } = config.requireObject<IEc2Config>('ec2');

  const serverName = `app-mpdw-ec2-${env}`;
  const keyName = `app-mpdw-keypairs-${env}`;

  // Pending: AMI, vpc, subnet, volume, user-data
  const server = new aws.ec2.Instance(serverName, { instanceType, keyName, tags });

  return server;
};
