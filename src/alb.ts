import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';

const pulumiProject = pulumi.getProject();
const stack = pulumi.getStack();
const timestamp = new Date().toISOString();
const baseTags: aws.Tags = {
  'pulumi:Project': pulumiProject,
  'pulumi:Stack': stack,
  purpose: 'alb',
  timestamp
};

interface ISettings {
  tableau: string[];
  emr: string[];
}

interface IAlbConfigs {
  vpcId: string;
  subnets: ISettings;
  securityGroups: ISettings;
  certificateArn: string;
}

interface IAlbConfigurationProps {
  env: string;
}

interface IAlbSettings {
  internal: aws.lb.LoadBalancer;
  external: aws.lb.LoadBalancer;
  targetGroups: ITargetGroups;
  internalListener: aws.lb.Listener;
  externalListener: aws.lb.Listener;
}

interface ITargetGroups {
  tableau: aws.lb.TargetGroup;
  tableauServiceManager: aws.lb.TargetGroup;
  jupyterHub: aws.lb.TargetGroup;
  livy: aws.lb.TargetGroup;
  spark: aws.lb.TargetGroup;
  hdfs: aws.lb.TargetGroup;
}

export const configureAlbs = ({ env }: IAlbConfigurationProps): IAlbSettings => {
  const config = new pulumi.Config();
  const { vpcId, subnets, securityGroups, certificateArn } = config.requireObject<IAlbConfigs>('alb');

  // Create load balancers
  const internal = createInternalAlb(env, subnets.emr, securityGroups.emr);
  const external = createExternalAlb(env, subnets.tableau, securityGroups.tableau);

  // Create target groups
  const targetGroups = createTargetGroups(env, vpcId);

  // Create target group attachment settings in order to register instances to the load balancer

  // Create load balancer listeners and their respective listener rules
  const internalListener = createInternalListener(env, internal, certificateArn, targetGroups);
  const externalListener = createExternalListener(env, external, certificateArn, targetGroups);

  return { internal, external, targetGroups, internalListener, externalListener };
};

const createExternalListener = (
  env: string,
  alb: aws.lb.LoadBalancer,
  certificateArn: string,
  { tableau }: ITargetGroups
): aws.lb.Listener => {
  const listener = new aws.lb.Listener(`app-mpdw-listener-${env}-external`, {
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

  createListenerRule(`app-mpdw-listenerrule-${env}-tableau`, listener, tableau.arn, 'tableau');

  return listener;
};

const createInternalListener = (
  env: string,
  alb: aws.lb.LoadBalancer,
  certificateArn: string,
  { tableauServiceManager, jupyterHub, livy, spark, hdfs }: ITargetGroups
): aws.lb.Listener => {
  const listener = new aws.lb.Listener(`app-mpdw-listener-${env}-internal`, {
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

  createListenerRule(
    `app-mpdw-listenerrule-${env}-tsm`,
    listener,
    tableauServiceManager.arn,
    'tableausm'
  );
  createListenerRule(`app-mpdw-listenerrule-${env}-jupyter`, listener, jupyterHub.arn, 'jupyter');
  createListenerRule(`app-mpdw-listenerrule-${env}-livy`, listener, livy.arn, 'livy');
  createListenerRule(`app-mpdw-listenerrule-${env}-spark`, listener, spark.arn, 'spark');
  createListenerRule(`app-mpdw-listenerrule-${env}-hdfs`, listener, hdfs.arn, 'hdfs');

  return listener;
};

const createListenerRule = (
  name: string,
  listener: aws.lb.Listener,
  targetGroupArn: pulumi.Output<string>,
  domain: string
) => {
  return new aws.lb.ListenerRule(
    name,
    {
      listenerArn: listener.arn,
      priority: 1,
      actions: [
        {
          type: 'forward',
          targetGroupArn
        }
      ],
      conditions: [
        {
          hostHeader: {
            values: [`${domain}.dataplatform.deepos.com`]
          }
        }
      ],
      tags: baseTags
    },
    { dependsOn: [listener] }
  );
};

const createTargetGroups = (env: string, vpcId: string): ITargetGroups => {
  const properties = {
    protocol: 'HTTP',
    vpcId,
    tags: { ...baseTags }
  };

  const tableau = new aws.lb.TargetGroup(`app-mpdw-tg-${env}-tableau`, {
    ...properties,
    port: 80
  });

  const tableauServiceManager = new aws.lb.TargetGroup(`app-mpdw-tg-${env}-tableausm`, {
    ...properties,
    port: 8850
  });

  // master-public-dns-name
  const jupyterHub = new aws.lb.TargetGroup(`app-mpdw-tg-${env}-jupyterhub`, {
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

  return { tableau, tableauServiceManager, jupyterHub, livy, spark, hdfs };
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
  const lbName = `data-lb-${env}-internal`;
  const lb = new aws.lb.LoadBalancer(lbName, {
    internal: true,
    loadBalancerType: 'application',
    securityGroups,
    subnets,
    enableDeletionProtection: true,
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
  subnets: string[],
  securityGroups: string[]
): aws.lb.LoadBalancer => {
  const lbName = `data-lb-${env}-external`;
  const lb = new aws.lb.LoadBalancer(lbName, {
    internal: true,
    loadBalancerType: 'application',
    securityGroups,
    subnets,
    enableDeletionProtection: true,
    tags: {
      ...baseTags,
      'alb-type': 'external'
    }
  });

  return lb;
};
