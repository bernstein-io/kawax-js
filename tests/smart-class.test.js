import _ from 'lodash';

import SmartClass from '../modules/smart_class';

class Parent extends SmartClass {

	static details = {
		context: {
			staticProps: 'This is a static prop'
		}
	};

	defaults() {
		return {
			context: {
				type: 'Parent',
				parentValue: true
			}
		};
	}

	defaultProps() {
		return {
			firstName: 'Walter',
			lastName: 'White'
		};
	}

}

class Child extends Parent {

	defaults() {
		return {
			didChange: false,
			testValue: false,
			context: {
				type: 'Child',
				date: Date.now()
			}
		}
	}

	onChange(property, newValue, previousValue) {
		this.didChange = true;
	}

}

describe('SMART_CLASS (PARENT)', () => {

	it('New instance with props', () => {
		let props = {firstName: 'Chuck', lastName: 'Norris'};
		let instance = Parent.new(props);
		expect(instance.props.details).toBeDefined();
		expect(instance.props.details).toEqual(Parent.details);
		expect(instance.props.firstName).toBeDefined();
		expect(instance.props.firstName).toEqual(props.firstName);
		expect(instance.props.lastName).toBeDefined();
		expect(instance.props.lastName).toEqual(props.lastName);
	});

	it('Instance with defaultProps', () => {
		let instance = Parent.new();
		expect(instance.props.firstName).toBeDefined();
		expect(instance.props.firstName).toEqual('Walter');
		expect(instance.props.lastName).toBeDefined();
		expect(instance.props.lastName).toEqual('White');
	});

	it('Instance with defaults value (context)', () => {
		let instance = Parent.new();
		expect(instance.context).toBeDefined();
	});

});

describe('SMART_CLASS (CHILD)', () => {

	it('Instance with defaults value from Parent (context.parentValue)', () => {
		let instance = Child.new();
		expect(instance.context).toBeDefined();
		expect(instance.context.parentValue).toBeDefined();
	});

});

describe('SET (VALUES)', () => {

	it('Set (merging value)', async () => {
		let instance = Child.new();
		await instance.set({setValues: {firstSet: 'firstSet'}});
		await instance.set({setValues: {secondSet: 'secondSet'}});
		expect(instance.setValues.firstSet).toBeDefined();
		expect(instance.setValues.secondSet).toBeDefined();
	});

	it('Call with callback on item (sync)', async () => {
		let instance = Child.new();
		instance.set({newValues: () => { return 'callback'; }});
		//await instance.set({newValues: async () => { return 'callback'; }});
		expect(instance.newValues).toEqual('callback');
	});

	it('Call onChange (true)', async () => {
		let instance = Child.new();
		await instance.set({newValues: {firstSet: 'firstSet'}});
		expect(instance.didChange).toBe(true);
	});

	it('Call onChange (false)', async () => {
		let instance = Child.new();
		await instance.set({testValue: false});
		expect(instance.didChange).toBe(false);
	});

});

describe('BEGIN...', () => {

	it('work with async function', async () => {
		let instance = Child.new();
		let promise = instance.begin({
			attempt: async () => {
				await instance.sleep();
				return 'attempt will succeed';
			},
			rescue: () => {
				return false;
			}
		});
		let attempt = await promise;
		expect(promise).toBeInstanceOf(Promise);
		expect(attempt).toEqual('attempt will succeed');
	});

	it('work with sync function', () => {
		let instance = Child.new();
		let attempt = instance.begin({
			attempt: () => {
				return 'attempt will succeed';
			},
			rescue: () => {
				return false;
			}
		});
		expect(attempt).toEqual('attempt will succeed');
	});

	it('work with sync function (shorthand)', () => {
		let instance = Child.new();
		let callback = () => { return 'shorthand test'; }
		let attempt = instance.begin({
			attempt: () => callback(),
			rescue: () => false
		});
		expect(attempt).toEqual('shorthand test');
	});

	it('catch error on sync callback', () => {
		let instance = Child.new();
		let attempt = instance.begin({
			attempt: () => {
				return value.notdefined;
			},
			rescue: () => {
				return 'attempt failed';
			},
			warn: false
		});
		expect(attempt).toEqual('attempt failed');
	});

	it('catch error on async callback', async () => {
		let instance = Child.new();
		let attempt = await instance.begin({
			attempt: async () => {
				await instance.sleep();
				return value.notdefined;
			},
			rescue: () => {
				return 'attempt failed (async)';
			},
			warn: false
		});
		expect(attempt).toEqual('attempt failed (async)');
	});

});
