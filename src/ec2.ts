import * as pulumi from '@pulumi/pulumi';

import { Instance } from '@pulumi/aws/ec2';

interface IEc2Config {
  instanceType: string;
}

export const configureEc2Instance = (env: string): Instance => {
  const config = new pulumi.Config();
  const { instanceType } = config.requireObject<IEc2Config>('ec2');

  const serverName = `data-tableau-${env}`;

  // Pending: AMI, secret key, vpc, subnet, volume, user-data
  const server = new Instance(serverName, { instanceType });

  return server;
};
