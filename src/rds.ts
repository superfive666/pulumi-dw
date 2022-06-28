import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';
import * as awsx from '@pulumi/awsx';

interface IRdsConfig {
  instanceType: string;
}

export const configureRds = async (
  env: string,
  vpc: awsx.ec2.Vpc,
  sg: aws.ec2.SecurityGroup
): Promise<aws.rds.Cluster> => {
  const pulumiProject = pulumi.getProject();
  const stack = pulumi.getStack();
  const tags: aws.Tags = {
    'pulumi:Project': pulumiProject,
    'pulumi:Stack': stack,
    Project: 'mpdw',
    purpose: 'emr'
  };

  const config = new pulumi.Config();
  const { instanceType } = config.requireObject<IRdsConfig>('rds');

  const clusterIdentifier = `app-mpdw-rds-${env}`;
  const dbSubnetGroupName = (await vpc.getSubnetsIds('private'))?.[0];

  const rds = new aws.rds.Cluster('postgresql', {
    clusterIdentifier,
    databaseName: clusterIdentifier,
    engine: 'aurora-postgresql',
    // DB engine version can be explored via the following commands:
    // aws rds describe-db-engine-versions --engine aurora-postgresql --query '*[].[EngineVersion]' --output text --region us-west-2
    engineVersion: '13.6',

    vpcSecurityGroupIds: [sg.id],
    dbSubnetGroupName,
    dbClusterInstanceClass: instanceType,

    // Integrate with AWS KMS for key deployment
    masterUsername: 'postgres',
    masterPassword: 'AppMpdwP@ssw0rd',
    port: 5432,
    iamDatabaseAuthenticationEnabled: true,

    tags
  });

  return Promise.resolve(rds);
};
