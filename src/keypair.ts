import * as pulumi from '@pulumi/pulumi';

import { log } from '../index';

/**
 * This fucntion retrieves RSA key pair from AWS account
 * The RSA key is used for all necessary resources in the entire setup of the app-mpdw project
 */
export const retrieveKeyPair = async (): Promise<string | undefined> => {
  const env = pulumi.getStack();
  const keyName = `app-mpdw-keypairs-${env}`;
  log('info', `Retrieving RSA Key Pair with name: ${keyName} ...`);

  return '';
};
