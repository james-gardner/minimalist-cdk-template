# Minimalist CDK Template

AWS CDK TypeScript project that creates a VPC with an EC2 instance and RDS PostgreSQL database. Fully parameterized for easy customization.

## Architecture

This stack creates:

- **VPC** with configurable Availability Zones (default: 2, required for RDS subnet groups)
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

All parameters can be provided via CDK context (command line `-c` flags or `cdk.json`).

### Command Line Parameters

Deploy with custom configuration:

```bash
# Custom stack name and region
npx cdk deploy -c stackName=MyAppStack -c region=eu-west-1

# Custom EC2 instance type
npx cdk deploy -c ec2InstanceClass=T2 -c ec2InstanceSize=SMALL

# Custom RDS configuration
npx cdk deploy -c rdsInstanceClass=T3 -c rdsInstanceSize=SMALL -c databaseName=mydb -c allocatedStorage=50

# Custom VPC configuration
npx cdk deploy -c vpcCidr=192.168.0.0/16 -c maxAzs=3

# All parameters combined
npx cdk deploy \
  -c stackName=ProductionStack \
  -c region=eu-west-2 \
  -c ec2InstanceClass=T3 \
  -c ec2InstanceSize=MICRO \
  -c rdsInstanceClass=T3 \
  -c rdsInstanceSize=MICRO \
  -c databaseName=appdb \
  -c allocatedStorage=20 \
  -c vpcCidr=10.0.0.0/16 \
  -c maxAzs=2
```

### Available Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `stackName` | `MinimalistCdkTemplateStack` | Name of the CloudFormation stack |
| `region` | `eu-west-2` | AWS region to deploy to |
| `account` | (from CLI) | AWS account ID |
| `ec2InstanceClass` | `T3` | EC2 instance class (T2, T3, M5, etc.) |
| `ec2InstanceSize` | `MICRO` | EC2 instance size (MICRO, SMALL, MEDIUM, etc.) |
| `rdsInstanceClass` | `T3` | RDS instance class |
| `rdsInstanceSize` | `MICRO` | RDS instance size |
| `databaseName` | `appdb` | PostgreSQL database name |
| `allocatedStorage` | `20` | RDS storage in GB |
| `vpcCidr` | `10.0.0.0/16` | VPC CIDR block |
| `maxAzs` | `2` | Maximum number of Availability Zones |

### Programmatic Configuration

When using this as a library:

```typescript
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { MinimalistCdkTemplateStack } from './lib/minimalist-cdk-template-stack';

new MinimalistCdkTemplateStack(app, 'MyStack', {
  env: { region: 'eu-west-1', account: '123456789012' },
  instanceType: ec2.InstanceType.of(ec2.InstanceClass.T2, ec2.InstanceSize.SMALL),
  rdsInstanceClass: ec2.InstanceClass.T3,
  rdsInstanceSize: ec2.InstanceSize.SMALL,
  databaseName: 'myCustomDb',
  allocatedStorage: 50,
  vpcCidr: '192.168.0.0/16',
  maxAzs: 3,
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
