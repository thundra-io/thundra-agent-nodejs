import GoogleCloudCommonIntegration from '../../dist/integrations/GoogleCloudCommonIntegration';
import ThundraTracer from '../../dist/opentracing/Tracer';
import ExecutionContextManager from '../../dist/context/ExecutionContextManager';
import ExecutionContext from '../../dist/context/ExecutionContext';
import {
    ErrorTags,
    SpanTags,
    ClassNames,
    SpanTypes,
    DomainNames,
    GoogleCommonOperationTypes,
    GoogleCommonTags,
    GoogleBigQueryTags,
} from '../../dist/Constants';

import Utils from '../../dist/utils/Utils';

const { BigQuery } = require('@google-cloud/bigquery');

describe('Google Cloud Common Integration', () => {
    
    jest.setTimeout(6000000);
    
    const error = new Error('Test Error!');
    
    const projectId = 'project-test';
    const location = 'europe-west1';
    const service = 'bigquery';
    const query = `SELECT *
        FROM \`pub-sub-tryer.bthndataset.json-table\`
        WHERE date < "2021-12-06"
        LIMIT 100`;

    let tracer;
    let integration;

    const mockReqeust = jest.fn((options, config, callback) => {
        console.log('ab');
        let currentInstance = mockReqeust.mock.instances[0];
        console.log('ab');
        callback(null, {
            id: `${projectId}:${location}.jobId`,
            jobReference: {
                projectId,
                jobId: 'jobId',
                location, 
            },
            status:{ state: 'RUNNING' },
        });
    });
    
    beforeAll(async () => {
        tracer = new ThundraTracer();
        ExecutionContextManager.set(new ExecutionContext({ tracer }));
        integration = new GoogleCloudCommonIntegration();
    });
    
    afterEach(() => {
        tracer.destroy();
    });

    test('should instrument biqquery job', async () => {
        integration.getOriginalFunction = () => mockReqeust;

        const bigquery = new BigQuery({
            projectId,
        });
        
        const options = { query };
        try {
            await bigquery.createQueryJob(options);
        } catch (error) {
            console.warn(error);
        }
     
        const spanList = tracer.getRecorder().spanList;

        expect(spanList.length).toBe(1);
        const jobSpan = spanList[0];

        expect(jobSpan.operationName).toBe(service);
        expect(jobSpan.className).toBe(ClassNames.GOOGLE_BIGQUERY);
        expect(jobSpan.domainName).toBe(DomainNames.API);
        expect(jobSpan.tags[SpanTags.OPERATION_TYPE]).toBe(GoogleCommonOperationTypes.QUERY);
        expect(jobSpan.tags[SpanTags.SPAN_TYPE]).toBe(SpanTypes.GOOGLE_BIGQUERY);
        expect(jobSpan.tags[SpanTags.TOPOLOGY_VERTEX]).toEqual(true);
        expect(jobSpan.tags[GoogleCommonTags.SERVICE]).toBe(service);
        expect(jobSpan.tags[GoogleBigQueryTags.OPERATION]).toBe('jobs');
        expect(jobSpan.tags[GoogleBigQueryTags.QUERY]).toBe(query);
        expect(jobSpan.tags[GoogleCommonTags.PROJECT_ID]).toBe(projectId);
    });
    
    test('should instrument biqquery select', async () => {
        integration.getOriginalFunction = () => mockReqeust;

        const bigquery = new BigQuery({
            projectId,
        });
        
        const options = { query };
        const [job] = await bigquery.createQueryJob(options);

        const [rows] = await job.getQueryResults();
        
        const spanList = tracer.getRecorder().spanList;

        expect(spanList.length).toBe(2);
        const querySpan = spanList[1];

        expect(querySpan.operationName).toBe(service);
        expect(querySpan.className).toBe(ClassNames.GOOGLE_BIGQUERY);
        expect(querySpan.domainName).toBe(DomainNames.API);
        expect(querySpan.tags[SpanTags.OPERATION_TYPE]).toBe(GoogleCommonOperationTypes.QUERY);
        expect(querySpan.tags[SpanTags.SPAN_TYPE]).toBe(SpanTypes.GOOGLE_BIGQUERY);
        expect(querySpan.tags[SpanTags.TOPOLOGY_VERTEX]).toEqual(true);
        expect(querySpan.tags[GoogleCommonTags.SERVICE]).toBe(service);
        expect(querySpan.tags[GoogleBigQueryTags.OPERATION]).toBe('queries');
        expect(querySpan.tags[GoogleCommonTags.PROJECT_ID]).toBe(projectId);
    });
});