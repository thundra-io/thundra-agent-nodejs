import Reporter from '../dist/Reporter';

test('request unauthorized apiKey', async () => {
    const reporter = new Reporter('apiKey');
    const mockReport1 = {data: 'data1'};
    const mockReport2 = {data: 'data2'};
    reporter.addReport(mockReport1);
    reporter.addReport(mockReport2);
    jest.useFakeTimers();
    let res = await reporter.request();
    jest.runAllTimers();
    expect(res.status).toBe(401);
});