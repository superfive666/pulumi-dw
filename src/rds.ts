import * as aws from '@pulumi/aws';
import * as pulumi from '@pulumi/pulumi';

interface IRdsConfig {
  engine: string;
  engineVersion: string;
  allocatedStorage: number;
  storageType: string;
  port: number;
  masterUsername: string;
  hiveUsername: string;
  iamDatabaseAuthenticationEnabled: boolean;
  instanceClass: string;
  subnetIds: string[];
  vpcSecurityGroupIds: string[];
}

interface IRdsConfigSettings {
  rds: aws.rds.Instance;
}

export const configureRds = (env: string): IRdsConfigSettings => {
  const pulumiProject = pulumi.getProject();
  const stack = pulumi.getStack();
  const tags: aws.Tags = {
    'pulumi:Project': pulumiProject,
    'pulumi:Stack': stack,
    Project: 'mpdw',
    purpose: 'emr'
  };

  const config = new pulumi.Config();
  const {
    instanceClass,
    engine,
    engineVersion,
    port,
    masterUsername,
    allocatedStorage,
    storageType,
    iamDatabaseAuthenticationEnabled,
    subnetIds,
    vpcSecurityGroupIds
  } = config.requireObject<IRdsConfig>('rds');

  const databaseName = `app-mpdw-${env}`;
  const password = config.requireSecret('masterPassword');

  const dbSubnetGroup = createDbSubnetGroup(env, subnetIds, tags);
  const dbSubnetGroupName = dbSubnetGroup.name;

  const rds = new aws.rds.Instance(databaseName, {
    dbName: `appmpdw${env}`,
    engine,
    // DB engine version can be explored via the following commands:
    // aws rds describe-db-engine-versions --engine aurora-postgresql --query '*[].[EngineVersion]' --output text --region us-west-2
    engineVersion,

    vpcSecurityGroupIds,
    allocatedStorage,
    storageType,
    dbSubnetGroupName,
    instanceClass,

    // Integrate with AWS KMS for key deployment
    username: masterUsername,
    password: password,
    port,
    iamDatabaseAuthenticationEnabled,

    tags
  });

  return { rds };
};

const createDbSubnetGroup = (
  env: string,
  subnetIds: string[],
  tags: aws.Tags
): aws.rds.SubnetGroup => {
  const subnetName = `app-mpdw-dbsn-${env}`;

  const subnet = new aws.rds.SubnetGroup(subnetName, {
    subnetIds,
    tags
  });

  return subnet;
};
