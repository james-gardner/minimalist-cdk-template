# Minimalist CDK Template

AWS CDK TypeScript project that creates a VPC with an EC2 instance and RDS PostgreSQL database for the London region (eu-west-2).

## Architecture

This stack creates:

- **VPC** with 2 Availability Zones (required for RDS subnet groups)
- **Public Subnets** with auto-assign public IP
- **Private Subnets** - isolated, no NAT gateway
- **EC2 Instance** (default: t3.micro for free tier eligibility) in the public subnet
- **SSM Session Manager** access enabled (no SSH ports opened)
- **RDS PostgreSQL Database** (default: db.t3.micro) in the private subnet
  - Only accessible from the EC2 instance via security groups
  - Auto-generated credentials stored in AWS Secrets Manager

## Free Tier Considerations

- Uses t3.micro EC2 instance type (free tier eligible)
- Uses db.t3.micro RDS instance type (free tier eligible)
- 20GB RDS storage (free tier eligible)
- No NAT Gateway (saves costs)
- Single instance RDS (not Multi-AZ)

## Configuration

The stack accepts the following optional props:

### Instance Type

The EC2 instance type is parameterized and can be changed:

```typescript
new MinimalistCdkTemplateStack(app, 'MinimalistCdkTemplateStack', {
  instanceType: ec2.InstanceType.of(ec2.InstanceClass.T2, ec2.InstanceSize.SMALL),
});
```

### RDS Configuration

The RDS instance class, size, and database name can be customized:

```typescript
new MinimalistCdkTemplateStack(app, 'MinimalistCdkTemplateStack', {
  rdsInstanceClass: ec2.InstanceClass.T3,
  rdsInstanceSize: ec2.InstanceSize.SMALL,
  databaseName: 'myCustomDb',
});
```

## Accessing the Instance

This stack uses **AWS Systems Manager Session Manager** for secure access instead of SSH. No ports are opened in the security group.

To connect to the instance:

```bash
aws ssm start-session --target <instance-id>
```

Or use the AWS Console: EC2 → Instances → Select Instance → Connect → Session Manager

## Accessing the Database

The RDS database is only accessible from the EC2 instance. To connect:

1. Connect to the EC2 instance via SSM Session Manager
2. Retrieve the database credentials from Secrets Manager:
   ```bash
   aws secretsmanager get-secret-value --secret-id <RdsSecretArn> --query SecretString --output text
   ```
3. Connect to the database using the PostgreSQL client:
   ```bash
   psql -h <RdsEndpoint> -U postgres -d appdb
   ```

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `npx cdk synth`   emits the synthesized CloudFormation template
* `npx cdk deploy`  deploy this stack to your default AWS account/region
* `npx cdk diff`    compare deployed stack with current state

## Prerequisites

- AWS CLI configured with appropriate credentials
- Node.js and npm installed
- CDK bootstrapped in your AWS account (`npx cdk bootstrap`)
- Session Manager plugin installed for AWS CLI (for `aws ssm start-session`)

## Outputs

After deployment, the stack outputs:
- `InstancePublicIp` - Public IP address of the EC2 instance
- `InstanceId` - Instance ID of the EC2 instance (use this with SSM)
- `RdsEndpoint` - RDS database endpoint address
- `RdsSecretArn` - ARN of the secret containing RDS credentials
