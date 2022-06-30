import * as aws from '@pulumi/aws';
import * as awsx from '@pulumi/awsx';
import * as mysql from '@pulumi/mysql';
import * as pulumi from '@pulumi/pulumi';

interface IRdsConfig {
  engine: string;
  engineVersion: string;
  port: number;
  masterUsername: string;
  hiveUsername: string;
  iamDatabaseAuthenticationEnabled: boolean;
  instanceClass: string;
}

export const configureRds = (
  env: string,
  vpc: awsx.ec2.Vpc,
  sg: aws.ec2.SecurityGroup
): aws.rds.Instance => {
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

  const config = new pulumi.Config();
  const {
    instanceClass,
    engine,
    engineVersion,
    port,
    masterUsername,
    hiveUsername,
    iamDatabaseAuthenticationEnabled
  } = config.requireObject<IRdsConfig>('rds');

  const databaseName = `appmpdwrds${env}`;
  const password = config.requireSecret('masterPassword');
  const hivePassword = config.requireSecret('hivePassword');

  const dbSubnetGroup = createDbSubnetGroup(env, vpc, tags);
  const dbSubnetGroupName = dbSubnetGroup.name;

  const rds = new aws.rds.Instance(
    databaseName,
    {
      name: databaseName,
      engine,
      // DB engine version can be explored via the following commands:
      // aws rds describe-db-engine-versions --engine aurora-postgresql --query '*[].[EngineVersion]' --output text --region us-west-2
      engineVersion,

      vpcSecurityGroupIds: [sg.id],
      dbSubnetGroupName,
      instanceClass,

      // Integrate with AWS KMS for key deployment
      username: masterUsername,
      password: password.apply((v) => v),
      port,
      iamDatabaseAuthenticationEnabled,

      tags
    },
    { dependsOn: [sg, vpc] }
  );

  createDbUser(rds, hiveUsername, hivePassword, masterUsername, password);

  return rds;
};

const createDbSubnetGroup = (
  env: string,
  vpc: awsx.ec2.Vpc,
  tags: aws.Tags
): aws.rds.SubnetGroup => {
  const subnetName = `app-mpdw-dbsn-${env}`;

  const subnet = new aws.rds.SubnetGroup(
    subnetName,
    {
      subnetIds: vpc.privateSubnetIds,
      tags
    },
    { dependsOn: [vpc] }
  );

  return subnet;
};

const createDbUser = (
  rds: aws.rds.Instance,
  hiveUsername: string,
  hivePassword: pulumi.Output<string>,
  masterUsername: string,
  masterPassword: pulumi.Output<string>
): void => {
  const provider = new mysql.Provider('mysql', {
    endpoint: rds.endpoint,
    username: masterUsername,
    password: masterPassword.apply((v) => v)
  });

  const databaseName = 'hive';
  const database = new mysql.Database(
    databaseName,
    {
      name: databaseName
    },
    { provider, dependsOn: [rds, provider] }
  );

  const user = new mysql.User(
    hiveUsername,
    {
      user: hiveUsername,
      plaintextPassword: hivePassword.apply((v) => v)
    },
    { provider, dependsOn: [rds, database, provider] }
  );

  new mysql.Grant(
    hiveUsername,
    {
      user: user.user,
      database: database.name,
      privileges: ['select', 'insert', 'update', 'delete']
    },
    { provider, dependsOn: [user, rds, database, provider] }
  );
};
