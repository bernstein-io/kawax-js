import Resource from '../../src/resources';

export default class ResourceMock extends Resource {

  defaultProps() {
    return {
      strict: false,
      wtf: ' sdfsdfsdfd'
    }
  }

  async request(options) {
    await this.sleep(1);
    return {
      statusCode: 200,
      statusMessage: 'OK',
      body: {first_name: 'Walter', last_name: 'White'}
    };
  }

  static schemaWithSecret = {
    key: 'current_user',
    secret: 'secret',
    properties: {
      id: {
        type: 'uuid',
        readOnly: true
      },
      name: {
        cipher: true,
        type: 'string'
      },
      last_name: {
        cipher: true,
        type: 'string'
      },
      address: {
        type: 'string'
      },
    }
  };

  static any() {
    return this.define({
      method: 'GET',
      path: '/mock/resource/',
    });
  }

  static get() {
    return this.define({
      method: 'GET',
      path: '/mock/resource/',
    });
  }

  static post() {
    return this.define({
      method: 'POST',
      path: '/mock/resource/',
    });
  }

}
