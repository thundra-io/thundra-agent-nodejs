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
    if ("source" in fields) {
      resource_name += " " + fields.source;
    }
    if ("destination" in fields) {
      resource_name += " " + fields.destination;
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
      SOURCE: 'source',
      DESTINATION: 'destination'
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

    span.setTag(AMQPTags.METHOD, method);
    span.setTag([SpanTags.OPERATION_TYPE], method);

  }

  private sendWithTrace = (originalfunc: Function, channel: any, args: any, config: any, method: any, fields: any) => {
        const { tracer } = ExecutionContextManager.get();
        const parentSpan = tracer.getActiveSpan();
        const span = tracer._startSpan('amqp.command'/* TODO */, {
            childOf: parentSpan,
            domainName: DomainNames.MESSAGING, //TODO
            className: ClassNames.AMQP,
            disableActiveStart: true,
        });
        this._handleTags(channel, config, span, method, fields);
        span._initialized();
        try {
            return originalfunc.apply(channel, args);
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
                return originalfunc.apply(channel, args);
            } 
        } finally {
            span.finish();
        }
  }

  /**
   * @inheritDoc
   */
  wrap(lib: any, config: any) {
    ThundraLogger.debug("<AMQPLIBIntegration> Wrap");

    const integration = this;

    function wrapSendMessage(sendMessage: Function) {

      return function sendMessageWithTrace(fields: any,  properties: any, content: any) {
        ThundraLogger.debug(`<AMQPLIBIntegration> Tracing sendMessage fields: ${fields}`);
        return integration.sendWithTrace(sendMessage, this, arguments, config, 'basic.publish', fields);

      };
    }

    function wrapSendImmediately(sendImmediately: Function) {
      return function sendImmediatelyWithTrace(method: any, fields: any) {
        ThundraLogger.debug(`<AMQPLIBIntegration> Tracing sendImmediately method: ${method}, fields:${fields}`);
        return integration.sendWithTrace(sendImmediately, this, arguments, config, method, fields);
      };
    }

    function wrapDispatchMessage(dispatchMessage: Function) {
      return function dispatchMessageWithTrace(fields: any, message: any) {
        ThundraLogger.debug(`<AMQPLIBIntegration> Tracing dispatchMessage fields: ${fields}, message:${message}`);
        return integration.sendWithTrace(dispatchMessage, this, arguments, config, 'basic.deliver', fields);
      };
    }

    ThundraLogger.debug('<AMQPLIBIntegration> Wrapping Channel.sendMessage, Channel.sendImmediately, BaseChannel.dispatchMessage');

    shimmer.wrap(lib.Channel.prototype, "sendMessage", wrapSendMessage);
    shimmer.wrap(lib.Channel.prototype, "sendImmediately", wrapSendImmediately);
    //shimmer.wrap(lib.Channel.prototype, "dispatchMessage", wrapDispatchMessage);
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
    shimmer.unwrap(lib.Channel.prototype, "sendImmediately");
    // shimmer.unwrap(lib.BaseChannel.prototype, "dispatchMessage");
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