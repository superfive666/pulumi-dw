import * as pulumi from '@pulumi/pulumi';

import { Tags } from '@pulumi/aws';
import { Role } from '@pulumi/aws/iam';
import { Vpc } from '@pulumi/awsx/ec2';
import { Cluster } from '@pulumi/aws/rds';
import { SecurityGroup } from '@pulumi/aws/ec2';

interface IRdsConfig {
  instanceType: string;
}

export const configureRds = async (env: string, vpc: Vpc, iam: Role, sg: SecurityGroup): Promise<Cluster> => {
  const pulumiProject = pulumi.getProject();
  const stack = pulumi.getStack();
  const tags: Tags = {
    'pulumi:Project': pulumiProject,
    'pulumi:Stack': stack,
    app: 'mpdw',
    purpose: 'emr'
  };

  const config = new pulumi.Config();
  const { instanceType } = config.requireObject<IRdsConfig>('rds');

  const clusterIdentifier = `app-mpdw-rds-${env}`;
  const dbSubnetGroupName = (await vpc.getSubnetsIds('private'))?.[0];

  const rds = new Cluster('postgresql', {
    clusterIdentifier,
    databaseName: clusterIdentifier,
    engine: 'aurora-postgresql',

    iamRoles: [iam.arn],
    vpcSecurityGroupIds: [sg.id],
    dbSubnetGroupName,
    dbClusterInstanceClass: instanceType,

    // Integrate with AWS KMS for key deployment
    masterUsername: 'postgres',
    masterPassword: 'AppMpdwP@ssw0rd',
    port: 5432,

    tags
  });

  return Promise.resolve(rds);
};
