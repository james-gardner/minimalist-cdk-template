#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { MinimalistCdkTemplateStack } from '../lib/minimalist-cdk-template-stack';

const app = new cdk.App();

// Read configuration from CDK context
// These can be provided via:
//   - cdk.json context section
//   - Command line: cdk deploy -c stackName=MyStack -c region=eu-west-1
const stackName = app.node.tryGetContext('stackName') ?? 'MinimalistCdkTemplateStack';
const region = app.node.tryGetContext('region') ?? 'eu-west-2';
const account = app.node.tryGetContext('account');

// EC2 configuration
const ec2InstanceClass = app.node.tryGetContext('ec2InstanceClass') ?? 'T3';
const ec2InstanceSize = app.node.tryGetContext('ec2InstanceSize') ?? 'MICRO';

// RDS configuration
const rdsInstanceClass = app.node.tryGetContext('rdsInstanceClass') ?? 'T3';
const rdsInstanceSize = app.node.tryGetContext('rdsInstanceSize') ?? 'MICRO';
const databaseName = app.node.tryGetContext('databaseName') ?? 'appdb';

// Parse and validate allocated storage (must be positive, minimum 20GB for free tier)
const allocatedStorageRaw = parseInt(app.node.tryGetContext('allocatedStorage') ?? '20', 10);
const allocatedStorage = isNaN(allocatedStorageRaw) || allocatedStorageRaw < 20 ? 20 : allocatedStorageRaw;

// VPC configuration
const vpcCidr = app.node.tryGetContext('vpcCidr') ?? '10.0.0.0/16';

// Parse and validate maxAzs (must be at least 2 for RDS subnet groups)
const maxAzsRaw = parseInt(app.node.tryGetContext('maxAzs') ?? '2', 10);
const maxAzs = isNaN(maxAzsRaw) || maxAzsRaw < 2 ? 2 : maxAzsRaw;

// Valid instance classes mapping
const instanceClassMap: Record<string, ec2.InstanceClass> = {
  T2: ec2.InstanceClass.T2,
  T3: ec2.InstanceClass.T3,
  T3A: ec2.InstanceClass.T3A,
  M5: ec2.InstanceClass.M5,
  M6I: ec2.InstanceClass.M6I,
  C5: ec2.InstanceClass.C5,
  C6I: ec2.InstanceClass.C6I,
  R5: ec2.InstanceClass.R5,
  R6I: ec2.InstanceClass.R6I,
};

// Valid instance sizes mapping
const instanceSizeMap: Record<string, ec2.InstanceSize> = {
  MICRO: ec2.InstanceSize.MICRO,
  SMALL: ec2.InstanceSize.SMALL,
  MEDIUM: ec2.InstanceSize.MEDIUM,
  LARGE: ec2.InstanceSize.LARGE,
  XLARGE: ec2.InstanceSize.XLARGE,
  XLARGE2: ec2.InstanceSize.XLARGE2,
  XLARGE4: ec2.InstanceSize.XLARGE4,
};

// Helper function to get InstanceClass from string with validation
function getInstanceClass(className: string): ec2.InstanceClass {
  const upperClassName = className.toUpperCase();
  return instanceClassMap[upperClassName] ?? ec2.InstanceClass.T3;
}

// Helper function to get InstanceSize from string with validation
function getInstanceSize(sizeName: string): ec2.InstanceSize {
  const upperSizeName = sizeName.toUpperCase();
  return instanceSizeMap[upperSizeName] ?? ec2.InstanceSize.MICRO;
}

// Create the stack with parameterized configuration
new MinimalistCdkTemplateStack(app, stackName, {
  env: {
    region: region,
    account: account, // If not provided, uses CDK_DEFAULT_ACCOUNT
  },
  instanceType: ec2.InstanceType.of(
    getInstanceClass(ec2InstanceClass),
    getInstanceSize(ec2InstanceSize)
  ),
  rdsInstanceClass: getInstanceClass(rdsInstanceClass),
  rdsInstanceSize: getInstanceSize(rdsInstanceSize),
  databaseName: databaseName,
  allocatedStorage: allocatedStorage,
  vpcCidr: vpcCidr,
  maxAzs: maxAzs,
});
