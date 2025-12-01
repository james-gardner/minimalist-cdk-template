import * as cdk from 'aws-cdk-lib/core';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import { Construct } from 'constructs';

export interface MinimalistCdkTemplateStackProps extends cdk.StackProps {
  /**
   * The EC2 instance type to use. Defaults to t3.micro for free tier eligibility.
   * @default ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO)
   */
  readonly instanceType?: ec2.InstanceType;

  /**
   * The RDS instance class to use. Defaults to db.t3.micro for free tier eligibility.
   * @default ec2.InstanceClass.T3
   */
  readonly rdsInstanceClass?: ec2.InstanceClass;

  /**
   * The RDS instance size to use. Defaults to MICRO for free tier eligibility.
   * @default ec2.InstanceSize.MICRO
   */
  readonly rdsInstanceSize?: ec2.InstanceSize;

  /**
   * The database name to create.
   * @default 'appdb'
   */
  readonly databaseName?: string;

  /**
   * The allocated storage for RDS in GB.
   * @default 20
   */
  readonly allocatedStorage?: number;

  /**
   * The VPC CIDR block.
   * @default '10.0.0.0/16'
   */
  readonly vpcCidr?: string;

  /**
   * The maximum number of Availability Zones to use.
   * Must be at least 2 for RDS subnet groups.
   * @default 2
   */
  readonly maxAzs?: number;
}

export class MinimalistCdkTemplateStack extends cdk.Stack {
  /** The VPC created by this stack */
  public readonly vpc: ec2.Vpc;

  /** The EC2 instance created by this stack */
  public readonly instance: ec2.Instance;

  /** The RDS database instance created by this stack */
  public readonly database: rds.DatabaseInstance;

  constructor(scope: Construct, id: string, props?: MinimalistCdkTemplateStackProps) {
    super(scope, id, props);

    // Use t3.micro by default for free tier eligibility
    const instanceType = props?.instanceType ?? ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO);

    // RDS instance configuration - defaults to db.t3.micro for free tier
    const rdsInstanceClass = props?.rdsInstanceClass ?? ec2.InstanceClass.T3;
    const rdsInstanceSize = props?.rdsInstanceSize ?? ec2.InstanceSize.MICRO;
    const databaseName = props?.databaseName ?? 'appdb';
    const allocatedStorage = props?.allocatedStorage ?? 20;

    // VPC configuration
    const vpcCidr = props?.vpcCidr ?? '10.0.0.0/16';
    const maxAzs = props?.maxAzs ?? 2;

    // Create a VPC with configurable AZs (minimum 2 required for RDS subnet groups)
    // The VPC will have public and private subnets in each AZ
    this.vpc = new ec2.Vpc(this, 'Vpc', {
      ipAddresses: ec2.IpAddresses.cidr(vpcCidr),
      maxAzs: maxAzs, // RDS requires at least 2 AZs for the subnet group
      natGateways: 0, // No NAT Gateway to stay on free tier
      subnetConfiguration: [
        {
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 24,
        },
      ],
    });

    // Create a security group for the EC2 instance
    const ec2SecurityGroup = new ec2.SecurityGroup(this, 'Ec2SecurityGroup', {
      vpc: this.vpc,
      description: 'Security group for EC2 instance',
      allowAllOutbound: true,
    });

    // Create an EC2 instance in the public subnet with SSM Session Manager access
    // No SSH port needs to be opened - access is via AWS Systems Manager
    this.instance = new ec2.Instance(this, 'Instance', {
      vpc: this.vpc,
      instanceType: instanceType,
      machineImage: ec2.MachineImage.latestAmazonLinux2023(),
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
      securityGroup: ec2SecurityGroup,
      ssmSessionPermissions: true, // Enable SSM Session Manager access
    });

    // Create a security group for the RDS instance
    // Only allows access from the EC2 instance's security group
    const rdsSecurityGroup = new ec2.SecurityGroup(this, 'RdsSecurityGroup', {
      vpc: this.vpc,
      description: 'Security group for RDS instance - only accessible from EC2',
      allowAllOutbound: false, // RDS doesn't need outbound access
    });

    // Allow PostgreSQL traffic (port 5432) only from EC2 security group
    rdsSecurityGroup.addIngressRule(
      ec2SecurityGroup,
      ec2.Port.tcp(5432),
      'Allow PostgreSQL access from EC2 instance only'
    );

    // Create the RDS PostgreSQL instance in the private subnet
    this.database = new rds.DatabaseInstance(this, 'Database', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_16,
      }),
      instanceType: ec2.InstanceType.of(rdsInstanceClass, rdsInstanceSize),
      vpc: this.vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
      securityGroups: [rdsSecurityGroup],
      databaseName: databaseName,
      allocatedStorage: allocatedStorage,
      maxAllocatedStorage: allocatedStorage, // Disable auto-scaling to stay on free tier
      credentials: rds.Credentials.fromGeneratedSecret('postgres'), // Auto-generate password
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For development - delete DB on stack deletion
      deleteAutomatedBackups: true, // Clean up backups on deletion
    });

    // Output the instance public IP
    new cdk.CfnOutput(this, 'InstancePublicIp', {
      value: this.instance.instancePublicIp,
      description: 'Public IP address of the EC2 instance',
    });

    // Output the instance ID
    new cdk.CfnOutput(this, 'InstanceId', {
      value: this.instance.instanceId,
      description: 'Instance ID of the EC2 instance',
    });

    // Output the RDS endpoint
    new cdk.CfnOutput(this, 'RdsEndpoint', {
      value: this.database.dbInstanceEndpointAddress,
      description: 'RDS database endpoint address',
    });

    // Output the RDS secret ARN (contains credentials)
    new cdk.CfnOutput(this, 'RdsSecretArn', {
      value: this.database.secret?.secretArn ?? 'N/A',
      description: 'ARN of the secret containing RDS credentials',
    });
  }
}
