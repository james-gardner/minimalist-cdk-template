import * as cdk from 'aws-cdk-lib/core';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export interface MinimalistCdkTemplateStackProps extends cdk.StackProps {
  /**
   * The EC2 instance type to use. Defaults to t3.micro for free tier eligibility.
   * @default ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO)
   */
  readonly instanceType?: ec2.InstanceType;

  /**
   * The CIDR range to allow SSH access from. For production, restrict this to
   * your organization's IP range. Consider using AWS Systems Manager Session
   * Manager instead of SSH for more secure access.
   * @default '0.0.0.0/0' (allows SSH from anywhere - NOT recommended for production)
   */
  readonly sshCidr?: string;
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

    // SSH CIDR - defaults to 0.0.0.0/0 but should be restricted in production
    const sshCidr = props?.sshCidr ?? '0.0.0.0/0';

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

    // Create a security group for the EC2 instance
    const securityGroup = new ec2.SecurityGroup(this, 'InstanceSecurityGroup', {
      vpc: this.vpc,
      description: 'Security group for EC2 instance',
      allowAllOutbound: true,
    });

    // Allow SSH access (port 22) from the specified CIDR range
    // WARNING: Default allows access from anywhere. Restrict this in production.
    securityGroup.addIngressRule(
      ec2.Peer.ipv4(sshCidr),
      ec2.Port.tcp(22),
      `Allow SSH access from ${sshCidr}`
    );

    // Create an EC2 instance in the public subnet
    this.instance = new ec2.Instance(this, 'Instance', {
      vpc: this.vpc,
      instanceType: instanceType,
      machineImage: ec2.MachineImage.latestAmazonLinux2023(),
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
      securityGroup: securityGroup,
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
