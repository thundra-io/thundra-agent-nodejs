const AWSOperationTypes: any = {
  exclusions: {
    'AWS-Lambda': {
      ListTags: 'READ',
      TagResource: 'WRITE',
      UntagResource: 'WRITE',
      EnableReplication: 'PERMISSION',
      InvokeAsync: 'WRITE',
      Invoke: 'WRITE',
    },
    'AWS-S3': {
      HeadBucket: 'LIST',
      ListBucketByTags: 'READ',
      ListBucketMultipartUploads: 'READ',
      ListBucketVersions: 'READ',
      ListJobs: 'READ',
      ListMultipartUploadParts: 'READ',
      GetBucketTagging: 'READ',
      GetObjectVersionTagging: 'READ',
      GetObjectTagging: 'READ',
      GetBucketObjectLockConfiguration: 'WRITE',
      GetObjectLegalHold: 'WRITE',
      GetObjectRetention: 'WRITE',
      DeleteObjectTagging: 'TAGGING',
      DeleteObjectVersionTagging: 'TAGGING',
      PutBucketTagging: 'TAGGING',
      PutObjectTagging: 'TAGGING',
      PutObjectVersionTagging: 'TAGGING',
      AbortMultipartUpload: 'WRITE',
      ReplicateDelete: 'WRITE',
      ReplicateObject: 'WRITE',
      RestoreObject: 'WRITE',
      DeleteBucketPolicy: 'PERMISSION',
      ObjectOwnerOverrideToBucketOwner: 'PERMISSION',
      PutAccountPublicAccessBlock: 'PERMISSION',
      PutBucketAcl: 'PERMISSION',
      PutBucketPolicy: 'PERMISSION',
      PutBucketPublicAccessBlock: 'PERMISSION',
      PutObjectAcl: 'PERMISSION',
      PutObjectVersionAcl: 'PERMISSION',
      deleteBucket: 'WRITE',
      CreateBucket: 'WRITE',
      CopyObject: 'WRITE',
      DeleteObject: 'WRITE',
      DeleteObjects: 'WRITE',
      GetObject: 'READ',
      GetObjects: 'READ',
      ListBuckets: 'LIST',
      PutObject: 'WRITE',
      GetBucketAcl: 'READ',
      GetObjectAcl: 'READ',
      GetSignedUrl: 'READ',
      HeadObject: 'READ',
      ListObjects: 'READ',
      ListObjectsV2: 'READ',
    },
    'AWS-SNS': {
      ListPhoneNumbersOptedOut: 'READ',
      ListTagsForResource: 'READ',
      CheckIfPhoneNumberIsOptedOut: 'READ',
      UntagResource: 'TAGGING',
      ConfirmSubscription: 'WRITE',
      OptInPhoneNumber: 'WRITE',
      Subscribe: 'WRITE',
      Unsubscribe: 'WRITE',
      Write: 'WRITE',
      Publish: 'WRITE',
    },
    'AWS-Athena': {
      BatchGetNamedQuery: 'READ',
      BatchGetQueryExecution: 'READ',
      ListTagsForResource: 'LIST',
      CreateWorkGroup: 'WRITE',
      UntagResource: 'TAGGING',
      TagResource: 'TAGGING',
      CancelQueryExecution: 'WRITE',
      RunQuery: 'WRITE',
      StartQueryExecution: 'WRITE',
      StopQueryExecution: 'WRITE',
      CreateNamedQuery: 'WRITE',
      DeleteNamedQuery: 'WRITE',
      DeleteWorkGroup: 'WRITE',
      GetNamedQuery: 'READ',
      GetQueryExecution: 'READ',
      GetQueryResults: 'READ',
      GetWorkGroup: 'READ',
      ListNamedQueries: 'READ',
      ListQueryExecutions: 'READ',
      ListWorkGroups: 'READ',
      UpdateWorkGroup: 'WRITE',
    },
    'AWS-Kinesis': {
      ListTagsForStream: 'READ',
      SubscribeToShard: 'READ',
      AddTagsToStream: 'TAGGING',
      RemoveTagsFromStream: 'TAGGING',
      DecreaseStreamRetentionPeriod: 'WRITE',
      DeregisterStreamConsumer: 'WRITE',
      DisableEnhancedMonitoring: 'WRITE',
      EnableEnhancedMonitoring: 'WRITE',
      IncreaseStreamRetentionPeriod: 'WRITE',
      MergeShards: 'WRITE',
      RegisterStreamConsumer: 'WRITE',
      SplitShard: 'WRITE',
      UpdateShardCount: 'WRITE',
      GetRecords: 'READ',
      PutRecords: 'WRITE',
      PutRecord: 'WRITE',
    },
    'AWS-Firehose': {
      DescribeDeliveryStream: 'LIST',
      StartDeliveryStreamEncryption: 'WRITE',
      StopDeliveryStreamEncryption: 'WRITE',
      TagDeliveryStream: 'WRITE',
      UntagDeliveryStream: 'WRITE',
      PutRecordBatch: 'WRITE',
      PutRecord: 'WRITE',
    },
    'AWS-SQS': {
      ListDeadLetterSourceQueues: 'READ',
      ListQueueTags: 'READ',
      ReceiveMessage: 'READ',
      TagQueue: 'TAGGING',
      UntagQueue: 'TAGGING',
      PurgeQueue: 'WRITE',
      SetQueueAttributes: 'WRITE',
      SendMessage: 'WRITE',
      SendMessageBatch: 'WRITE',
      DeleteMessage: 'WRITE',
      DeleteMessageBatch: 'WRITE',
    },
    'AWS-DynamoDB': {
      BatchGetItem: 'READ',
      ConditionCheckItem: 'READ',
      ListStreams: 'READ',
      ListTagsOfResource: 'READ',
      Query: 'READ',
      Scan: 'READ',
      TagResource: 'TAGGING',
      UntagResource: 'TAGGING',
      BatchWriteItem: 'WRITE',
      PurchaseReservedCapacityOfferings: 'WRITE',
      RestoreTableFromBackup: 'WRITE',
      RestoreTableToPointInTime: 'WRITE',
      CreateTable: 'WRITE',
      CreateGlobalTable: 'WRITE',
      DeleteItem: 'WRITE',
      DeleteTable: 'WRITE',
      GetItem: 'READ',
      PutItem: 'WRITE',
      UpdateItem: 'WRITE',
    },
    'AWS-EventBridge': {
      TestEventPattern: 'READ',
      PutRule: 'TAGGING',
      ActivateEventSource: 'WRITE',
      DeactivateEventSource: 'WRITE',
      DisableRule: 'WRITE',
      EnableRule: 'WRITE',
      PutEvents: 'WRITE',
      PutPartnerEvents: 'WRITE',
      PutPermission: 'WRITE',
      PutTargets: 'WRITE',
      RemovePermission: 'WRITE',
      RemoveTargets: 'WRITE',
    },
    'AWS-SES': {
      VerifyDomainDkim: 'READ',
      VerifyDomainIdentity: 'READ',
      VerifyEmailAddress: 'READ',
      VerifyEmailIdentity: 'READ',
      CloneReceiptRuleSet: 'WRITE',
      ReorderReceiptRuleSet: 'WRITE',
      TestRenderTemplate: 'WRITE',
    },
  },
  patterns: {
    '^List.*$': 'LIST',
    '^Get.*$': 'READ',
    '^Create.*$': 'WRITE',
    '^Delete.*$': 'WRITE',
    '^Invoke.*$': 'WRITE',
    '^Publish.*$': 'WRITE',
    '^Put.*$': 'WRITE',
    '^Update.*$': 'WRITE',
    '^Describe.*$': 'READ',
    '^Change.*$': 'WRITE',
    '^Send.*$': 'WRITE',
    '^.*Permission$': 'PERMISSION',
    '^.*Tagging$': 'TAGGING',
    '^.*Tags$': 'TAGGING',
    '^Set.*$': 'WRITE',
  },
};

export default AWSOperationTypes;
