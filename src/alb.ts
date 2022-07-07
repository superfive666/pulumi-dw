import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';

const pulumiProject = pulumi.getProject();
const stack = pulumi.getStack();
const baseTags: aws.Tags = {
  'pulumi:Project': pulumiProject,
  'pulumi:Stack': stack,
  purpose: 'alb'
};

interface IAlbConfigs {
  vpcId: string;
  subnets: string[];
  securityGroups: string[];
  certificateArn: string;
  baseDomain: string;
}

interface IAlbConfigurationProps {
  env: string;
  ec2: aws.ec2.Instance;
  emr: aws.emr.Cluster;
}

interface IAlbSettings {
  internal: aws.lb.LoadBalancer;
  targetGroups: ITargetGroups;
  internalListener: aws.lb.Listener;
  nlb: aws.lb.LoadBalancer;
}

interface ITargetGroups {
  tableau: aws.lb.TargetGroup;
  tableausm: aws.lb.TargetGroup;
  jupyterHub: aws.lb.TargetGroup;
  livy: aws.lb.TargetGroup;
  spark: aws.lb.TargetGroup;
  hdfs: aws.lb.TargetGroup;
  presto: aws.lb.TargetGroup;
}

export const configureAlbs = ({ env, ec2 }: IAlbConfigurationProps): IAlbSettings => {
  const config = new pulumi.Config();
  const { vpcId, subnets, securityGroups, certificateArn, baseDomain } =
    config.requireObject<IAlbConfigs>('alb');

  // Create load balancer
  const internal = createInternalAlb(env, subnets, securityGroups);

  // Create target groups
  // Create target group attachment settings in order to register instances to the load balancer
  const targetGroups = createTargetGroups(env, vpcId, ec2);

  // Create load balancer listeners and their respective listener rules
  const internalListener = createInternalListener(
    env,
    internal,
    certificateArn,
    baseDomain,
    targetGroups
  );

  const nlb = createNetworkLoadBalancer(env, internal, subnets, vpcId);

  return { internal, targetGroups, internalListener, nlb };
};

const createNetworkLoadBalancer = (
  env: string,
  alb: aws.lb.LoadBalancer,
  subnets: string[],
  vpcId: string
): aws.lb.LoadBalancer => {
  const lbName = `app-mpdw-nlb-${env}`;
  // Network load balancers do not support security group configuration
  const lb = new aws.lb.LoadBalancer(lbName, {
    internal: false,
    loadBalancerType: 'network',
    subnets,
    enableDeletionProtection: false,
    tags: {
      ...baseTags,
      'alb-type': 'network'
    }
  });

  const albTg = new aws.lb.TargetGroup(`app-mpdw-tg-${env}-alb`, {
    port: 443,
    protocol: 'TCP',
    targetType: 'alb',
    vpcId,
    tags: { ...baseTags }
  });
  new aws.lb.TargetGroupAttachment(
    `app-mpdw-${env}-alb`,
    {
      targetGroupArn: albTg.arn,
      targetId: alb.arn,
      port: 443
    },
    { dependsOn: [albTg, alb] }
  );

  new aws.lb.Listener(`app-mpdw-${env}-nlb`, {
    loadBalancerArn: lb.arn,
    port: 443,
    protocol: 'TCP',
    defaultActions: [
      {
        type: 'forward',
        targetGroupArn: albTg.arn
      }
    ],
    tags: baseTags
  });
  

  return lb;
};

const createInternalListener = (
  env: string,
  alb: aws.lb.LoadBalancer,
  certificateArn: string,
  baseDomain: string,
  { tableau, tableausm, jupyterHub, livy, spark, hdfs, presto }: ITargetGroups
): aws.lb.Listener => {
  const listener = new aws.lb.Listener(`app-mpdw-${env}`, {
    loadBalancerArn: alb.arn,
    port: 443,
    protocol: 'HTTPS',
    sslPolicy: 'ELBSecurityPolicy-2016-08',
    certificateArn,
    defaultActions: [
      {
        type: 'fixed-response',
        fixedResponse: {
          contentType: 'text/plain',
          messageBody: 'Invalid domain name, please check with the IT team',
          statusCode: '200'
        }
      }
    ],
    tags: baseTags
  });

  createListenerRule(`app-mpdw-${env}-tbl`, listener, tableau.arn, baseDomain, 'tableau');
  createListenerRule(`app-mpdw-${env}-tsm`, listener, tableausm.arn, baseDomain, 'tableausm');
  createListenerRule(`app-mpdw-${env}-jp`, listener, jupyterHub.arn, baseDomain, 'jupyter');
  createListenerRule(`app-mpdw-${env}-livy`, listener, livy.arn, baseDomain, 'livy');
  createListenerRule(`app-mpdw-${env}-spark`, listener, spark.arn, baseDomain, 'spark');
  createListenerRule(`app-mpdw-${env}-hdfs`, listener, hdfs.arn, baseDomain, 'hdfs');
  createListenerRule(`app-mpdw-${env}-presto`, listener, presto.arn, baseDomain, 'presto');

  return listener;
};

const createListenerRule = (
  name: string,
  listener: aws.lb.Listener,
  targetGroupArn: pulumi.Output<string>,
  baseDomain: string,
  domain: string
) => {
  return new aws.lb.ListenerRule(
    name,
    {
      listenerArn: listener.arn,
      actions: [
        {
          type: 'forward',
          targetGroupArn
        }
      ],
      conditions: [
        {
          hostHeader: {
            values: [`${domain}.dataplatform.${baseDomain}`]
          }
        }
      ],
      tags: baseTags
    },
    { dependsOn: [listener] }
  );
};

const createTargetGroups = (env: string, vpcId: string, ec2: aws.ec2.Instance): ITargetGroups => {
  const properties = {
    protocol: 'HTTP',
    vpcId,
    tags: { ...baseTags }
  };

  const tableau = new aws.lb.TargetGroup(`app-mpdw-tg-${env}-tableau`, {
    ...properties,
    port: 80
  });
  new aws.lb.TargetGroupAttachment(
    `app-mpdw-tgatt-${env}-tableau`,
    {
      targetGroupArn: tableau.arn,
      targetId: ec2.id,
      port: 80
    },
    { dependsOn: [tableau] }
  );

  const tableausm = new aws.lb.TargetGroup(`app-mpdw-tg-${env}-tsm`, {
    ...properties,
    port: 8850,
    protocol: 'HTTPS'
  });
  new aws.lb.TargetGroupAttachment(
    `app-mpdw-tgatt-${env}-tsm`,
    {
      targetGroupArn: tableausm.arn,
      targetId: ec2.id,
      port: 8850
    },
    { dependsOn: [tableausm] }
  );

  // master-public-dns-name
  const jupyterHub = new aws.lb.TargetGroup(`app-mpdw-tg-${env}-jh`, {
    ...properties,
    port: 9443
  });

  // master-public-dns-name
  const livy = new aws.lb.TargetGroup(`app-mpdw-tg-${env}-livy`, {
    ...properties,
    port: 8998
  });

  // master-public-dns-name
  const spark = new aws.lb.TargetGroup(`app-mpdw-tg-${env}-spark`, {
    ...properties,
    port: 8998
  });

  // master-public-dns-name
  const hdfs = new aws.lb.TargetGroup(`app-mpdw-tg-${env}-hdfs`, {
    ...properties,
    port: 9870
  });

  // master-public-dns-name
  const presto = new aws.lb.TargetGroup(`app-mpdw-tg-${env}-presto`, {
    ...properties,
    port: 8889
  });

  return { tableau, tableausm, jupyterHub, livy, spark, hdfs, presto };
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
  subnets: string[],
  securityGroups: string[]
): aws.lb.LoadBalancer => {
  const lbName = `app-mpdw-lb-${env}`;
  const lb = new aws.lb.LoadBalancer(lbName, {
    internal: true,
    loadBalancerType: 'application',
    securityGroups,
    subnets,
    enableDeletionProtection: false,
    tags: {
      ...baseTags,
      'alb-type': 'internal'
    }
  });

  return lb;
};
