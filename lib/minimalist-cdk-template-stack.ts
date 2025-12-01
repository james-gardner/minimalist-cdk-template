import * as cdk from 'aws-cdk-lib/core';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export interface MinimalistCdkTemplateStackProps extends cdk.StackProps {
  /**
   * The EC2 instance type to use. Defaults to t3.micro for free tier eligibility.
   * @default ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO)
   */
  readonly instanceType?: ec2.InstanceType;
}

export class MinimalistCdkTemplateStack extends cdk.Stack {
  /** The VPC created by this stack */
  public readonly vpc: ec2.Vpc;

  /** The EC2 instance created by this stack */
  public readonly instance: ec2.Instance;

  constructor(scope: Construct, id: string, props?: MinimalistCdkTemplateStackProps) {
    super(scope, id, props);

    // Use t3.micro by default for free tier eligibility
    const instanceType = props?.instanceType ?? ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO);

    // Create a VPC with 1 AZ (London region - eu-west-2a)
    // The VPC will have 1 public subnet and 1 private subnet
    this.vpc = new ec2.Vpc(this, 'Vpc', {
      maxAzs: 1, // Use only 1 Availability Zone
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

    // Create an EC2 instance in the public subnet with SSM Session Manager access
    // No SSH port needs to be opened - access is via AWS Systems Manager
    this.instance = new ec2.Instance(this, 'Instance', {
      vpc: this.vpc,
      instanceType: instanceType,
      machineImage: ec2.MachineImage.latestAmazonLinux2023(),
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
      ssmSessionPermissions: true, // Enable SSM Session Manager access
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
  }
}
