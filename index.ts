import * as pulumi from '@pulumi/pulumi';

import { configureVpc } from './src/vpc';
import { configureRds } from './src/rds';
import { configureAlbs } from './src/alb';
import { configureS3Bucket } from './src/s3';
import { configureEmrCluster } from './src/emr';
import { configureEc2Instance } from './src/ec2';

export const log = (level: 'info' | 'warning' | 'error', message: string) => {
  const formatted = `${new Date().toISOString()} [${level.toUpperCase()}]: ${message}`;
  console.log(formatted);
};

export const createVpc = () => {
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

export const start = (env: string) => {
  log('info', 'Pulumi deployment started...');

  // Create the S3 bucket for EMR to store necessary HDFS files
  const s3 = configureS3Bucket(env);
  s3.id.apply((s3BucketId) => {
    log('info', `S3 bucket ID ${s3BucketId} created successfully`);
  });

  // // Create necessary IAM roles for AWS resources
  // const roles = configureIamRoles(s3);
  // pulumi.all([roles.emr.arn, roles.tableau.arn]).apply(([emr, tableua]) => {
  //   log('info', `IAM role for EMR created with ARN: ${emr}`);
  //   log('info', `IAM role Tableau ALB created with ARN: ${tableua}`);
  // });

  // Create small RDS instance for EMR to store metadata information
  const { rds } = configureRds(env);
  rds.arn.apply((rdsArn) => log('info', `RDS for EMR metatdata created with ARN: ${rdsArn}`));

  // Create EC2 instance for installation of Tableau
  const tableau = configureEc2Instance(env);
  tableau.arn.apply((ec2Arn) =>
    log('info', `EC2 instance for installing tableau created with ARN: ${ec2Arn}`)
  );

  // Create EMR cluster
  const emr = configureEmrCluster(env, rds, s3);
  emr.arn.apply((emrArn) => log('info', `EMR cluster created with ARN: ${emrArn}`));

  // Create ALB instances
  const albs = configureAlbs({ env, ec2: tableau, emr });

  return {
    s3,
    emr,
    rds,
    tableau,
    ...albs
  };
};

// GLOBAL config variables
const env = pulumi.getStack();
log('info', `Current pulumi environment building is ${env}`);

export const stacks = env === 'vpc' ? createVpc() : start(env);
