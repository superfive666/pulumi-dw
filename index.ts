import * as pulumi from '@pulumi/pulumi';

import { configureVpc } from './src/vpc';
import { configureRds } from './src/rds';
import { configureAlbs } from './src/alb';
import { configureS3Bucket } from './src/s3';
import { configureIamRoles } from './src/iam';
import { configureEc2Instance } from './src/ec2';

export const log = (level: 'info' | 'warning' | 'error', message: string) => {
  const formatted = `${new Date().toISOString()} [${level.toUpperCase()}]: ${message}`;
  console.log(formatted);
};

const start = async (): Promise<void> => {
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

  // // Create small RDS instance for EMR to store metadata information
  // const rds = await configureRds(env, vpc, roles.rds, securityGroups.rds);
  // rds.arn.apply((rdsArn) => log('info', `RDS for EMR metatdata created with ARN: ${rdsArn}`));
  //
  // // Create EC2 instance for installation of Tableau
  // const tableau = configureEc2Instance(env);
  // tableau.arn.apply((ec2Arn) => log('info', `EC2 instance for installing tableau created with ARN: ${ec2Arn}`));
  //
  // // Create EMR cluster
  // // const emr = configureEmrCluster(env);
  //
  // // Create relevant ALBs including respective target groups
  // const albs = await configureAlbs({
  //   env,
  //   albSecurityGroup: securityGroups.alb,
  //   albInternalSecurityGroup: securityGroups.alb2,
  //   vpc
  // });
  // pulumi.all([albs.internal.arn, albs.external.arn]).apply(([internal, external]) => {
  //   log('info', `Internal ALB (engineer) created with ARN: ${internal}`);
  //   log('info', `External ALB (http/https) created with ARN: ${external}`);
  // });
};

start();
