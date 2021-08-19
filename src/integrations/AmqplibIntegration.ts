import Integration from "./Integration";

import {
  SpanTags,
  SpanTypes,
  DomainNames,
  AMQPTags,
  ClassNames,
} from "../Constants";

import ThundraLogger from "../ThundraLogger";
import ModuleUtils from "../utils/ModuleUtils";
import ThundraChaosError from "../error/ThundraChaosError";
import ExecutionContextManager from "../context/ExecutionContextManager";

const shimmer = require("shimmer");

const MODULE_NAME = "amqplib/lib/channel.js";
const MODULE_VERSION = ">=0.5";

/**
 * {@link Integration} implementation for AMQPLIB Integration
 * through {@code amqplib} library
 */
class AMQPLIBIntegration implements Integration {
  config: any;
  private instrumentContext: any;

  constructor(config: any) {
    ThundraLogger.debug("<AMQPLIBIntegration> Activating AMQPLIB Integration");

    this.config = config || {};
    this.instrumentContext = ModuleUtils.instrument(
      [MODULE_NAME],
      MODULE_VERSION,
      (lib: any, cfg: any) => {
        this.wrap.call(this, lib, cfg);
      },
      (lib: any, cfg: any) => {
        this.doUnwrap.call(this, lib);
      },
      this.config
    );
  }

  private _getResourceName (method: any, fields?: any) {
    let resource_name = method;
    if ("exchange" in fields) {
      resource_name += " " + fields.exchange;
    }
    if ("routingKey" in fields) {
      resource_name += " " + fields.routingKey;
    }
    if ("queue" in fields) {
      resource_name += " " + fields.queue;
    }
    if ("consumerTag" in fields) {
      resource_name += " " + fields.consumerTag
    }
    return resource_name;
  }



  private _handleTags = (channel: any, config: any, span: any, method: any, fields: any) => {
    
    span.setTag(SpanTags.SPAN_TYPE, SpanTypes.AMQP);

    type fieldNameType = {
      [key: string]: string,
    }
    
    const fieldNames: fieldNameType = {
      QUEUE: 'queue',
      EXCHANGE: 'exchange',
      ROUTING_KEY: 'routingKey',
      CONSUMER_TAG: 'consumerTag',
    }

    span.addTags({
      'service.name': config.service || `amqp-default-service`,
      'resource.name': this._getResourceName(method, fields),
    })
  
    if (channel && channel.connection && channel.connection.stream) {
      span.addTags({
        [AMQPTags.HOST]: channel.connection.stream._host,
        [AMQPTags.PORT]: channel.connection.stream.remotePort,
      })
    }

    Object.keys(fieldNames).forEach(key  => {
      const field = fieldNames[key];
      fields[field] !== undefined && span.setTag(AMQPTags[key], fields[field])
    });

    span.setTag("amqp.method", method);
    span.setTag([SpanTags.OPERATION_TYPE], method.split('.')[1]);

  }

  /**
   * @inheritDoc
   */
  wrap(lib: any, config: any) {
    ThundraLogger.debug("<AMQPLIBIntegration> Wrap");

    const integration = this;

    function wrapSendMessage(sendMessage: Function) {

      /**
       * Wrap the sendMessage
       * @param args sendMessage function parameters in order fields, properties and content. 
       */
      return function sendMessageWithTrace(...args: any) {
        ThundraLogger.debug(`<AMQPLIBIntegration> Tracing sendMessage args: ${args}`);
        const method = 'basic.publish';
        const [ fields, properties, content ] = args;
        const { tracer } = ExecutionContextManager.get();
        const parentSpan = tracer.getActiveSpan();
        const span = tracer._startSpan('amqp.send', {
            childOf: parentSpan,
            domainName: DomainNames.MESSAGING,
            className: ClassNames.AMQP,
            disableActiveStart: true,
        });
        integration._handleTags(this, config, span, method, fields)
        span._initialized();
        try {
            return sendMessage.apply(this, args);
          } catch (error) {
            ThundraLogger.error('<AMQPLIBIntegration> Error occurred while tracing AMQP ${method} method:', error);

            if (span) {
                ThundraLogger.debug(
                    `<AMQPLIBIntegration> Because of error, closing AMQP span with name ${span.getOperationName()}`);
                span.finish();
            }

            if (error instanceof ThundraChaosError) {
                throw error;
            } else { 
                return sendMessage.apply(this, args);
            } 
        } finally {
            span.finish();
        }
      };
    }

    function wrapDispatchMessage(dispatchMessage: Function) {
      /**
       * Wrap the dispatchMessage
       * @param args dispatchMessage function parameters in order fields and message. 
       */
      return function dispatchMessageWithTrace(...args: any) {
        ThundraLogger.debug(`<AMQPLIBIntegration> Tracing dispatchMessage args: ${args}`);
        const method = 'basic.deliver';
        const [ fields, message ] = args;
        const { tracer } = ExecutionContextManager.get();
        const parentSpan = tracer.getActiveSpan();
        const span = tracer._startSpan('amqp.dispatch', {
            childOf: parentSpan,
            domainName: DomainNames.MESSAGING,
            className: ClassNames.AMQP,
            disableActiveStart: true,
        });
        integration._handleTags(this, config, span, method, fields);
        try {
          span.setTag("amqp.message", message.content.toString())
        } catch(err) {
          ThundraLogger.error('<AMQPLIBIntegration> Error occurred while converting message to string AMQP', err);
        }
        span._initialized();
        try {
            return dispatchMessage.apply(this, args);       
        } catch (error) {
            ThundraLogger.error('<AMQPLIBIntegration> Error occurred while tracing AMQP ${method} method:', error);

            if (span) {
                ThundraLogger.debug(
                    `<AMQPLIBIntegration> Because of error, closing AMQP span with name ${span.getOperationName()}`);
                span.finish();
            }

            if (error instanceof ThundraChaosError) {
                throw error;
            } else { 
              return dispatchMessage.apply(this, args);
            } 
        } finally {
            span.finish();
        }
      };
    }

    ThundraLogger.debug('<AMQPLIBIntegration> Wrapping Channel.sendMessage, Channel.sendImmediately, BaseChannel.dispatchMessage');
    shimmer.wrap(lib.Channel.prototype, "sendMessage", wrapSendMessage);
    shimmer.wrap(lib.BaseChannel.prototype, "dispatchMessage", wrapDispatchMessage);
  }

  /**
   * @inheritDoc
   */
  doUnwrap(lib: any) {
    ThundraLogger.debug("<AMQPLIBIntegration> Do unwrap");

    ThundraLogger.debug(
      "<AMQPLIBIntegration> Unwrapping Channel.sendMessage, Channel.sendImmediately, BaseChannel.dispatchMessage"
    );

    shimmer.unwrap(lib.Channel.prototype, "sendMessage");
    shimmer.unwrap(lib.BaseChannel.prototype, "dispatchMessage");
  }

  /**
   * @inheritDoc
   */
  unwrap() {
    ThundraLogger.debug("<AMQPLIBIntegration> Unwrap");

    if (this.instrumentContext.uninstrument) {
      this.instrumentContext.uninstrument();
    }
  }
}

export default AMQPLIBIntegration;