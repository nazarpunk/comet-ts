const channels: { [key: string]: boolean } = {},
      pipes: { [key: string]: Function[] } = {},
      localStorage_name                    = 'CometServerUUID';

let socket: WebSocket,
    reconnect_timeout: number = 0;

let uuid = localStorage.getItem(localStorage_name);
if (!uuid) {
	uuid = '';
	const a = "qwertyuiopasdfghjklzxcvbnm1234567890QWERTYUIOPASDFGHJKLZXCVBNM_-";
	for (let i = 0; i < 32; i++) uuid += a[Math.floor(Math.random() * a.length)];
	localStorage.setItem(localStorage_name, uuid);
}

const subscribe = (channel: string) => {
	channels[channel] = true;
	if (socket && socket.readyState === WebSocket.OPEN) socket.send('subscription\n' + channel);
	else setTimeout(() => subscribe(channel), 300);
}

interface CometResponse {
	authorized: boolean,
	SendToUser?: boolean,
	event_name: string | 'CometServerError',
	data: string,
	pipe: string,
	error?: string
}

const json_parse_message = (json: string): CometResponse | string => {
	try {return JSON.parse(json);} catch (e) {
		return json;
	}
}

const json_parse_data = (json: string): {} | string => {
	try {return JSON.parse(json);} catch (e) {
		try {return JSON.parse(json.replace(/\\"/g, `"`));} catch (e) {
			return json;
		}
	}
}

const reconect = () => {
	if (socket && socket.readyState === WebSocket.CLOSED) connect();
	reconnect_timeout = setTimeout(reconect, 1000);
}

let socket_url = ``;
const connect = () => {
	socket = new WebSocket(socket_url);
	socket.onopen = () => {
		for (const channel of Object.keys(channels)) subscribe(channel);
		//console.log(socket, socket.readyState, socket.readyState === WebSocket.CLOSED)
		//reconect();
	};

	socket.onmessage = e => {
		const message = json_parse_message(e.data.replace(/\\\\\\'/g, `'`).replace(/\s+/g, ' ').trim());

		if (typeof message === `string` ||
		    (message.hasOwnProperty(`error`) && message.event_name === `CometServerError`)
		) return console.error(`Comet [onmessage]`, message);

		if (message.hasOwnProperty(`authorized`)) return;

		const pipe       = message.hasOwnProperty(`SendToUser`) && message.SendToUser ? `private` : message.pipe,
		      event      = message.event_name,
		      event_name = `${pipe}|${event}`,
		      data       = json_parse_data(message.data);

		if (!pipes.hasOwnProperty(event_name)) return;
		for (const cb of pipes[event_name]) cb(data);
	};

	socket.onclose = e => {
		console.error(`Comet [onclose]`, e)
		clearTimeout(reconnect_timeout);
		//connect();
	};

	socket.onerror = e => {
		console.error(`Comet [onerror]`, e);
	}
}

// noinspection JSUnusedGlobalSymbols
const CometConnect = (
	domain: string,
	session: string,
	myid: string,
	devid: string,
	api: string = `js`,
	v: string   = `4.09`
) => {
	socket_url = `wss://${domain}/comet-server/ws/sesion=${session}&myid=${myid}&devid=${devid}&v=${v}&uuid=${uuid}&api=${api}`;
	connect();
}

// noinspection JSUnusedGlobalSymbols
const CometEvent = (channel: string, event: string, cb: Function) => {
	if (!socket) connect();
	if (channel !== `private`) subscribe(channel);
	const event_name = `${channel}|${event}`;
	if (!pipes.hasOwnProperty(event_name)) pipes[event_name] = [];
	for (const e of pipes[event_name]) if (e === cb) return;
	pipes[event_name].push(cb);
}


export {CometConnect, CometEvent};