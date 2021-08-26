import Integration from './Integration';

import {
  SpanTags,
  SpanTypes,
  DomainNames,
  AMQPTags,
  ClassNames,
} from '../Constants';

import ThundraLogger from '../ThundraLogger';
import ModuleUtils from '../utils/ModuleUtils';
import ThundraChaosError from '../error/ThundraChaosError';
import ExecutionContextManager from '../context/ExecutionContextManager';
import * as opentracing from 'opentracing';

const shimmer = require('shimmer');
const has = require('lodash.has');
const URL = require('url-parse');

const MODULE_NAME = ['amqplib', 'amqplib/lib/callback_model.js', 'amqplib/lib/channel_model.js', 'amqplib/lib/channel.js'];
const MODULE_VERSION = '>=0.5';

/**
 * {@link Integration} implementation for AMQPLIB Integration
 * through {@code amqplib} library
 */
class AMQPLIBIntegration implements Integration {
  config: any;
  queueName: any;
  vhost: any;
  private instrumentContext: any;

  constructor(config: any) {
    ThundraLogger.debug('<AMQPLIBIntegration> Activating AMQPLIB Integration');

    this.config = config || {};
    this.instrumentContext = ModuleUtils.instrument(
      MODULE_NAME,
      MODULE_VERSION,
      (lib: any, cfg: any) => {
        this.wrap.call(this, lib, cfg);
      },
      (lib: any, cfg: any) => {
        this.doUnwrap.call(this, lib);
      },
      this.config,
    );
  }

  /**
   * @inheritDoc
   */
  wrap(lib: any, config: any) {
    ThundraLogger.debug('<AMQPLIBIntegration> Wrap');

    const integration = this;

    function wrapSendMessage(sendMessage: Function) {
      /**
       * Wrap the sendMessage
       * @param args sendMessage function parameters in order fields, properties and content.
       */
      return function sendMessageWithTrace(...args: any) {
        ThundraLogger.debug(
          `<AMQPLIBIntegration> Tracing sendMessage args: ${args}`,
        );
        let span;
        try {
          const {tracer} = ExecutionContextManager.get();

          if (!tracer) {
            ThundraLogger.debug('<AMQPLIBIntegration> Skipped tracing command as no tracer is available');
            return sendMessage.apply(this, args);
          }

          const method = 'basic.publish';
          const [fields, properties, content] = args;
          const parentSpan = tracer.getActiveSpan();
          span = tracer._startSpan(integration.queueName + integration.vhost, {
            childOf: parentSpan,
            domainName: DomainNames.MESSAGING,
            className: ClassNames.AMQP,
            disableActiveStart: true,
          });
          integration.handleTags(this, config, span, method, fields);
          span.addTags({
            [AMQPTags.MESSAGE]: content.toString(),
            [AMQPTags.QUEUE]: integration.queueName,
            [AMQPTags.VHOST]: integration.vhost,
          });
          span._initialized();
          tracer.inject(span.spanContext, opentracing.FORMAT_TEXT_MAP, properties.headers);
        } catch (error) {
          ThundraLogger.error(
              '<AMQPLIBIntegration> Error occurred while tracing AMQP ${method} method:',
              error,
          );
          if (span) {
            ThundraLogger.debug(
                `<AMQPLIBIntegration> Because of error, closing AMQP span with name ${span.getOperationName()}`,
            );
            span.setErrorTag(error);
            span.close();
            span = null;
          }
          if (error instanceof ThundraChaosError) {
            throw error;
          }
        }
        try {
          return sendMessage.apply(this, args);
        } catch (error) {
          if (span) {
            span.setErrorTag(error);
          }
        } finally {
          if (span) {
            span.close();
          }
        }
      };
    }

    function wrapAssertQueue(assertQueue: Function) {
      /**
       * Wrap AssertQueue to retrieve queueName
       * @param args sendMessage function parameters in order queueName, opts.
       */
      return function getQueueName(...args: any) {
        ThundraLogger.debug(
          `<AMQPLIBIntegration> Tracing assertQueue args: ${args}`,
        );
        try {
          const queue = args[0];
          integration.queueName = queue;
        } catch (err) {
          ThundraLogger.debug(
            `<AMQPLIBIntegration> Couldn't get queueName.`,
          );
          integration.queueName = '';
        }
        return assertQueue.apply(this, args);
      };
    }

    function wrapConnect(connect: Function) {
      /**
       * Wrap connection to retrieve vhost
       * @param args sendMessage function parameters in order url, sockopts
       */
      return function getVhost(...args: any) {
        ThundraLogger.debug(
          `<AMQPLIBIntegration> Tracing connect args: ${args}`,
        );
        const url = args[0];
        try {
          if (typeof url === 'object') {
            if (url.hasOwnProperty('vhost')) {
              integration.vhost = '::/' + url.vhost;
            } else {
              integration.vhost = '::/';
            }
          } else {
            const parts = URL(url, true);
            integration.vhost = parts.pathname ? parts.pathname.substr(1) : null;
            if (integration.vhost === null || integration.vhost === undefined) {
              integration.vhost = '::/';
            } else {
              integration.vhost = '::/' + integration.vhost;
            }
          }
        } catch (err) {
          ThundraLogger.debug(
            `<AMQPLIBIntegration> Couldn't get vhost`,
          );
          integration.vhost = '';
        }
        return connect.apply(this, args);
      };
    }

    ThundraLogger.debug(
      '<AMQPLIBIntegration> Wrapping Channel.sendMessage',
    );
    if (has(lib, 'Channel.prototype.sendMessage')) {
      shimmer.wrap(lib.Channel.prototype, 'sendMessage', wrapSendMessage);
    }
    if (has(lib, 'Channel.prototype.assertQueue')) {
      shimmer.wrap(lib.Channel.prototype, 'assertQueue', wrapAssertQueue);
    }
    if (has(lib, 'connect')) {
      shimmer.wrap(lib, 'connect', wrapConnect);
    }
  }

  /**
   * @inheritDoc
   */
  doUnwrap(lib: any) {
    ThundraLogger.debug('<AMQPLIBIntegration> Do unwrap');

    ThundraLogger.debug(
      '<AMQPLIBIntegration> Unwrapping Channel.sendMessage',
    );

    shimmer.unwrap(lib.Channel.prototype, 'sendMessage');
    shimmer.unwrap(lib.Channel.prototype, 'assertQueue');
  }

  /**
   * @inheritDoc
   */
  unwrap() {
    ThundraLogger.debug('<AMQPLIBIntegration> Unwrap');

    if (this.instrumentContext.uninstrument) {
      this.instrumentContext.uninstrument();
    }
  }

  private handleTags = (
    channel: any,
    config: any,
    span: any,
    method: any,
    fields: any,
  ) => {
    span.setTag(SpanTags.SPAN_TYPE, SpanTypes.AMQP);

    interface FieldNameType {
      [key: string]: string;
    }

    const fieldNames: FieldNameType = {
      EXCHANGE: 'exchange',
      ROUTING_KEY: 'routingKey',
    };

    span.addTags({
      'service.name': config.service || `amqp-default-service`,
      [SpanTags.TOPOLOGY_VERTEX]: true,
    });

    if (channel && channel.connection && channel.connection.stream) {
      span.addTags({
        [AMQPTags.HOST]: channel.connection.stream._host,
        [AMQPTags.PORT]: channel.connection.stream.remotePort,
      });
    } else {
      span.addTags({
        [AMQPTags.HOST]: '',
        [AMQPTags.PORT]: 0,
      });
    }

    Object.keys(fieldNames).forEach((key) => {
      const field = fieldNames[key];
      if (fields[field] !== undefined) {
        span.setTag(AMQPTags[key], fields[field]);
      }
    });

    span.setTag('amqp.method', method);
    span.setTag([SpanTags.OPERATION_TYPE], method.split('.')[1]);
  }
}

export default AMQPLIBIntegration;
