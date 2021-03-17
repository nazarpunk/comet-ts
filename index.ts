const channels: { [key: string]: boolean } = {},
      pipes: { [key: string]: Function[] } = {},
      localStorage_name                    = 'CometServerUUID';

let socket: WebSocket,
    reconnect_timeout: number = 0;

let uuid = localStorage.getItem(localStorage_name);
if (!uuid) {
	uuid = '';
	const a = "qwertyuiopasdfghjklzxcvbnm1234567890QWERTYUIOPASDFGHJKLZXCVBNM_-";
	for (let i = 0; i < 256; i++) uuid += a[Math.floor(Math.random() * a.length)];
	localStorage.setItem(localStorage_name, uuid);
}

const subscribe = (channel: string) => {
	channels[channel] = true;
	if (socket && socket.readyState === WebSocket.OPEN) socket.send('subscription\n' + channel);
	else setTimeout(() => subscribe(channel), 300);
}


const json_parse = (json: string) => {
	try {return JSON.parse(json);} catch (e) {
		try { return JSON.parse(json.replace(/\\"/g, `"`))} catch (e) {console.error(json);}
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
		reconect();
	};

	socket.onmessage = e => {
		const message = JSON.parse(e.data.replace(/\\\\\\'/g, `'`));
		if (message.hasOwnProperty(`authorized`)) return;

		const pipe       = message.hasOwnProperty(`SendToUser`) && message.SendToUser ? `private` : message.pipe,
		      event      = message.event_name,
		      event_name = `${pipe}|${event}`,
		      data       = json_parse(message.data) || {};


		if (!pipes.hasOwnProperty(event_name)) return;
		for (const cb of pipes[event_name]) cb(data);
	};

	socket.onclose = () => {
		clearTimeout(reconnect_timeout);
		connect();
	};

	socket.onerror = e => {
		console.error(e);
	}
}

// noinspection JSUnusedGlobalSymbols
const CometSetting = (domain: string, session: string, myid: string, devid: string, api: string = `js`, v: string = `4.09`) => {
	//const devid   = 3,
	// session = document.head.dataset.cometSession || ``,
	//  myid    = document.head.dataset.userId || `0`;
	//`wss://on.chat/comet-server/ws/sesion=${session}?api=js&myid=${myid}&devid=${devid}&v=4.09&uuid=${uuid}`
	socket_url = `wss://${domain}/comet-server/ws/sesion=${session}?myid=${myid}&devid=${devid}&uuid=${uuid}&api=${api}&v=${v}`;
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


export {CometSetting, CometEvent};