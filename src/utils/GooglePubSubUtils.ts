class GooglePubSubUtils {

    private constructor() {
    }

    static getTopic(config: any) {
        if (!config || !config.reqOpts) {
            return;
        }

        return config.reqOpts[config.method === 'createTopic' ? 'name' : 'topic'];
    }

    static parseMessage(message: any) {
        if (!message) {
            return;
        }

        return {
            ...(message.data ? { data: message.data.toString('utf-8') } : undefined),
            ...(message.attributes ? { attributes: message.attributes } : undefined),
            ...(message.messageId ? { messageId: message.messageId } : undefined),
        };
    }

    static parseMessages(messages: any = []) {
        if (!messages) {
            return;
        }

        const parsedMessages: any = [];

        messages.forEach((message: any) => {
            const parsedMessage = GooglePubSubUtils.parseMessage(message);
            if (parsedMessage) {
                parsedMessages.push(parsedMessage);
            }
        });

        return parsedMessages;
    }
}

export default GooglePubSubUtils;
