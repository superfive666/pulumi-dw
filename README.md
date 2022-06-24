# AWS Pulumi

## General Information

Before your begin using the `pulumi`, run the following command on your MacOS to install `pulumi`:

```
brew install pulumi/tap/pulumi
```

This project uses typescript for formalising the infrastructure, install the required dependencies using `HomeBrew`:

```
brew install npm node

npm --version

node --version
```

For language specific linting, the following packages are optional:

```
npm install -g eslint typescript prettier
```

The following configurations are needed during execution of the `pulumi` project scripts:

```
# The acces key ID and access key secret should be corresponding to the AWS account used for deploying the stack
export AWS_ACCESS_KEY_ID=<YOUR_ACCESS_KEY_ID>
export AWS_SECRET_ACCESS_KEY=<YOUR_SECRET_ACCESS_KEY>
```

This project was initialized using the following commands (there will be interactive steps for initializing projects)

```
pulumi new aws-typescript
```

For more details on `pulumi` integration with the `AWS` resources, refer to [API Docs](https://www.pulumi.com/registry/packages/aws/api-docs/).

## Deployment Steps

Run the following commands for deployment:

```
# note: this command needs to be executed in the root directory of this repository
pulumi up
```
