import * as pulumi from '@pulumi/pulumi';

import { Tags } from '@pulumi/aws/tags';
import { SecurityGroup } from '@pulumi/aws/ec2';
import { Vpc, VpcSubnetArgs } from '@pulumi/awsx/ec2';

interface IVpcDetails {
  vpc: Vpc;
  securityGroups: SecurityGroup[];
}

interface IVpcConfig {
  numberOfAvailabilityZones: number;
  numberOfNatGateways: number;
}

export const configureVpc = (env: string): IVpcDetails => {
  const vpc = createVpc(env);
  const securityGroups = createSecurityGroups(env);

  return { vpc, securityGroups };
};

const createVpc = (env: string): Vpc => {
  const pulumiProject = pulumi.getProject();
  const stack = pulumi.getStack();

  const config = new pulumi.Config();
  const vpcName = `data-platform-vpc-${env}`;
  const cidrBlock = '10.1.0.0/16';
  const { numberOfAvailabilityZones = 1, numberOfNatGateways = 1 } = config.requireObject<IVpcConfig>('vpc');

  const tags: Tags = {
    Name: vpcName,
    availability_zones_used: numberOfAvailabilityZones.toString(),
    nat_gateways: numberOfNatGateways.toString(),
    cidr_block: cidrBlock,
    crosswalk: 'yes',
    'pulumi:Project': pulumiProject,
    'pulumi:Stack': stack
  };

  const subnets: VpcSubnetArgs[] = [];

  const vpc = new Vpc(vpcName, {
    numberOfAvailabilityZones,
    cidrBlock,
    numberOfNatGateways,
    subnets,
    tags
  });

  return vpc;
};

const createSecurityGroups = (env: string): SecurityGroup[] => {
  const baseName = 'data-platform-sg';
  const pulumiProject = pulumi.getProject();
  const stack = pulumi.getStack();
  const baseTags = {
    'pulumi:Project': pulumiProject,
    'pulumi:Stack': stack
  };

  const alb = new SecurityGroup(`${baseName}-${env}-alb`, {
    description: 'Security group for ALB resource',
    // allow 80 and 443
    ingress: [],
    tags: {
      ...baseTags,
      purpose: 'alb'
    }
  });
  const alb2 = new SecurityGroup(`${baseName}-${env}-alb2`, {
    description: 'Security group for internal ALB resource',
    // allow all relevant ports
    ingress: [],
    tags: {
      ...baseTags,
      purpose: 'alb-internal'
    }
  });
  const emr = new SecurityGroup(`${baseName}-${env}-emr`, {
    description: 'Security group for EMR resource',
    // allow access from tableau and internal ALB
    ingress: [],
    tags: {
      ...baseTags,
      purpose: 'emr'
    }
  });
  const rds = new SecurityGroup(`${baseName}-${env}-rds`, {
    description: 'Security group for RDS resource',
    // only allow access from EMR (for storing metadata)
    ingress: [],
    tags: {
      ...baseTags,
      purpose: 'rds'
    }
  });
  const tableau = new SecurityGroup(`${baseName}-${env}-tableau`, {
    description: 'Security group for EC2 instance that will be installed with Tableau app',
    // allow access from general ALB instance
    ingress: [],
    tags: {
      ...baseTags,
      purpose: 'tableau'
    }
  });

  return [alb, alb2, emr, rds, tableau];
};
