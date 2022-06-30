import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';
import * as awsx from '@pulumi/awsx';

const pulumiProject = pulumi.getProject();
const stack = pulumi.getStack();
const baseTags: aws.Tags = {
  'pulumi:Project': pulumiProject,
  'pulumi:Stack': stack,
  purpose: 'alb'
};

interface IAlbConfigurationProps {
  env: string;
  albSecurityGroup: aws.ec2.SecurityGroup;
  albInternalSecurityGroup: aws.ec2.SecurityGroup;
  vpc: awsx.ec2.Vpc;
}

interface IAlbSettings {
  internal: aws.lb.LoadBalancer;
  external: aws.lb.LoadBalancer;
}

export const configureAlbs = ({
  env,
  albSecurityGroup,
  albInternalSecurityGroup,
  vpc
}: IAlbConfigurationProps): IAlbSettings => {
  const internal = createInternalAlb(env, albInternalSecurityGroup, vpc);
  const external = createExternalAlb(env, albSecurityGroup, vpc);

  // 1. Create respective target group, `TargetGroup`
  // 2. Create target group attachment for registering instances to the target groups, `TargetGroupAttachment`
  // 3. Create listener for the load balancer, `Listener`
  // 4. Create listener rules for the load balancer, `ListenerRule`

  return { internal, external };
};

/**
 * Internal Load Balancer is for specific data engineers to access the respective
 * resources directly via their relevant ports.
 * There will be more listeners created under such load balancer for respective ports.
 *
 * @param env The pulumi environment key, such as `dev`
 */
const createInternalAlb = (
  env: string,
  sg: aws.ec2.SecurityGroup,
  vpc: awsx.ec2.Vpc
): aws.lb.LoadBalancer => {
  const lbName = `data-lb-${env}-internal`;
  const lb = new aws.lb.LoadBalancer(lbName, {
    internal: true,
    loadBalancerType: 'application',
    securityGroups: [sg.arn],
    enableDeletionProtection: true,
    subnets: vpc.publicSubnetIds,
    tags: {
      ...baseTags,
      'alb-type': 'internal'
    }
  });

  return lb;
};

/**
 * External Load Balancer is the standard load balancer for http/https (80,443) traffic.
 * There will only be 2 listners crreated for this load balancer.
 *
 * @param env The pulumi environment key, such as `dev`
 */
const createExternalAlb = (
  env: string,
  sg: aws.ec2.SecurityGroup,
  vpc: awsx.ec2.Vpc
): aws.lb.LoadBalancer => {
  const lbName = `data-lb-${env}-external`;
  const lb = new aws.lb.LoadBalancer(lbName, {
    internal: true,
    loadBalancerType: 'application',
    securityGroups: [sg.arn],
    subnets: vpc.publicSubnetIds,
    enableDeletionProtection: true,
    tags: {
      ...baseTags,
      'alb-type': 'external'
    }
  });

  return lb;
};
