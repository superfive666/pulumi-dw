import * as pulumi from '@pulumi/pulumi';

import { configureVpc } from './src/vpc';
import { configureRds } from './src/rds';
import { configureS3Bucket } from './src/s3';
import { configureAlbs } from './src/alb';
import { configureIamRoles } from './src/iam';
import { configureEmrCluster } from './src/emr';
import { configureEc2Instance } from './src/ec2';

export const log = (level: 'info' | 'warning' | 'error', message: string) => {
  const formatted = `${new Date().toISOString()} [${level.toUpperCase()}]: ${message}`;
  console.log(formatted);
};

const start = async (): Promise<void> => {
  // GLOBAL config variables
  const env = pulumi.getStack();
  log('info', `Current pulumi environment building is ${env}`);

  // Create the S3 bucket for EMR to store necessary HDFS files
  const s3 = configureS3Bucket(env);
  log('info', `S3 bucket named ${s3.id} created successfully`);

  // Create necessary IAM roles for AWS resources
  const roles = configureIamRoles(env);
  log('info', `IAM roles are created: ${roles}`);

  // Create required VPC for the data-platform
  const {} = configureVpc(env);
  log('info', `VPC created successfully`);

  // Create EC2 instance for installation of Tableau
  const tableau = configureEc2Instance(env);
  log('info', `EC2 instance for installing tableau completed successfully: ${tableau}`);

  // Create small RDS instance for EMR to store metadata information
  const rds = configureRds(env);
  log('info', `Small RDS instance created successfully for EMR cluster: ${rds}`);

  // Create EMR cluster
  const emr = configureEmrCluster(env);
  log('info', `EMR cluster created successfully: ${emr}`);

  // Create relevant ALBs including respective target groups
  const albs = await configureAlbs();
  log('info', `All ALBs are created successfully: ${albs}`);
};

start();
