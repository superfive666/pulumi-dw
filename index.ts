import * as pulumi from '@pulumi/pulumi';

import { configureVpc } from './src/vpc';
import { configureRds } from './src/rds';
import { configureS3Bucket } from './src/s3';
import { configureIamRoles } from './src/iam';
import { configureEc2Instance } from './src/ec2';

export const log = (level: 'info' | 'warning' | 'error', message: string) => {
  const formatted = `${new Date().toISOString()} [${level.toUpperCase()}]: ${message}`;
  console.log(formatted);
};

export const createVpc = () => {
  // GLOBAL config variables
  const env = pulumi.getStack();
  log('info', `Current pulumi environment building is ${env}`);

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

export const start = () => {
  log('info', 'Pulumi deployment started...');

  // GLOBAL config variables
  const env = pulumi.getStack();
  log('info', `Current pulumi environment building is ${env}`);

  // Create the S3 bucket for EMR to store necessary HDFS files
  const s3 = configureS3Bucket(env);
  s3.id.apply((s3BucketId) => {
    log('info', `S3 bucket ID ${s3BucketId} created successfully`);
  });

  // Create necessary IAM roles for AWS resources
  const roles = configureIamRoles(s3);
  pulumi.all([roles.emr.arn, roles.tableau.arn]).apply(([emr, tableua]) => {
    log('info', `IAM role for EMR created with ARN: ${emr}`);
    log('info', `IAM role Tableau ALB created with ARN: ${tableua}`);
  });

  // Create small RDS instance for EMR to store metadata information
  const rds = configureRds(env);
  rds.arn.apply((rdsArn) => log('info', `RDS for EMR metatdata created with ARN: ${rdsArn}`));

  // Create EC2 instance for installation of Tableau
  const tableau = configureEc2Instance(env, roles.tableau);
  tableau.arn.apply((ec2Arn) =>
    log('info', `EC2 instance for installing tableau created with ARN: ${ec2Arn}`)
  );

  return {
    s3,
    roles,
    rds,
    tableau
  };
};

export const stacks = start();
