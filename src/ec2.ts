import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';

interface IEc2Config {
  instanceType: string;
}

export const configureEc2Instance = (env: string): aws.ec2.Instance => {
  const config = new pulumi.Config();
  const { instanceType } = config.requireObject<IEc2Config>('ec2');

  const serverName = `data-tableau-${env}`;

  // Pending: AMI, secret key, vpc, subnet, volume, user-data
  const server = new aws.ec2.Instance(serverName, { instanceType });

  return server;
};
