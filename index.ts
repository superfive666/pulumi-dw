import * as pulumi from '@pulumi/pulumi';

import { configureVpc } from './src/vpc';
import { configureRds } from './src/rds';
import { configureAlbs } from './src/alb';
import { configureIamRoles } from './src/iam';
import { configureEc2Instance } from './src/ec2';
import { configureS3Bucket, configureS3BucketPolicy } from './src/s3';
import { configureEmrCluster, configureJupyterCluster } from './src/emr';

export const log = (level: 'info' | 'warning' | 'error', message: string) => {
  const formatted = `${new Date().toISOString()} [${level.toUpperCase()}]: ${message}`;
  console.log(formatted);
};

const createVpc = () => {
  // VPC creation only valid for `dev` environment as this is for the POC stage
  const env = 'dev';

  // Create required VPC for the data-platform
  const { vpc, securityGroups } = configureVpc(env);
  pulumi
    .all([
      vpc.vpc.arn,
      securityGroups.alb.arn,
      securityGroups.alb2.arn,
      securityGroups.emr.arn,
      securityGroups.rds.arn,
      securityGroups.tableau.arn
    ])
    .apply(([vpc, alb, alb2, emr, rds, tableau]) => {
      log('info', `Project APP MPDW VPC created with ARN: ${vpc}`);
      log('info', `Security group for standard ALB created with ARN: ${alb}`);
      log('info', `Security group for internal (engineer) ALB created with ARN: ${alb2}`);
      log('info', `Security group for EMR cluster created with ARN: ${emr}`);
      log('info', `Security group for RDS metadata created with ARN: ${rds}`);
      log('info', `Security group for EC2 installing tableau created with ARN: ${tableau}`);
    });

  return { vpc, securityGroups };
};

const start = (env: string) => {
  log('info', 'Pulumi deployment started...');

  // Create the S3 bucket for EMR to store necessary HDFS files
  const { log: s3, jupyter, rdl, sdl, adl } = configureS3Bucket(env);
  pulumi
    .all([s3.id, jupyter.id, rdl.id, sdl.id, adl.id])
    .apply(([s3Id, jptId, rdlId, sdlId, adlId]) => {
      log('info', `S3 bucket ID ${s3Id} created successfully`);
      log('info', `S3 bucket ID ${jptId} created successfully`);
      log('info', `S3 bucket ID ${rdlId} created successfully`);
      log('info', `S3 bucket ID ${sdlId} created successfully`);
      log('info', `S3 bucket ID ${adlId} created successfully`);
    });

  // Create necessary IAM roles for the stack
  const {
    emrEmr,
    emrJpt,
    ec2Emr,
    ec2Jpt,
    ec2Tbl,
    scaling: scalingRole
  } = configureIamRoles({ env, rdl, sdl, adl, jupyter, s3 });

  // const {
  //   rdl: rdlPolicy,
  //   sdl: sdlPolicy,
  //   adl: adlPolicy
  // } = configureS3BucketPolicy({
  //   env,
  //   rdl,
  //   sdl,
  //   adl,
  //   jpt: jupyter,
  //   emr: { emr: emrEmr, jpt: emrJpt },
  //   ec2: { emr: ec2Emr, jpt: ec2Jpt }
  // });

  // Create small RDS instance for EMR to store metadata information
  const { rds } = configureRds(env);
  rds.arn.apply((rdsArn) => log('info', `RDS for EMR metatdata created with ARN: ${rdsArn}`));

  // Create EC2 instance for installation of Tableau
  const tableau = configureEc2Instance(env, ec2Tbl);
  tableau.arn.apply((ec2Arn) =>
    log('info', `EC2 instance for installing tableau created with ARN: ${ec2Arn}`)
  );

  // Create EMR cluster
  const emr = configureEmrCluster(env, rds, s3, ec2Emr, emrEmr);
  emr.arn.apply((emrArn) => log('info', `EMR cluster created with ARN: ${emrArn}`));
  const emrjpt = configureJupyterCluster(env, rds, s3, jupyter, ec2Jpt, emrJpt, scalingRole);
  emrjpt.arn.apply((emrArn) => log('info', `EMR (Jupyter) cluster created with ARN: ${emrArn}`));

  // Create ALB instances
  const albs = configureAlbs({ env, ec2: tableau, emr, jpt: emrjpt });

  return {
    s3,
    jupyter,
    rdl,
    sdl,
    adl,
    emr,
    rds,
    tableau,
    // rdlPolicy,
    // sdlPolicy,
    // adlPolicy,
    ...albs
  };
};

// GLOBAL config variables
const env = pulumi.getStack();
log('info', `Current pulumi environment building is ${env}`);

export const stacks = env === 'vpc' ? createVpc() : start(env);
