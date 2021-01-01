const PORT = 7777;

var vars = require('./contract/variables.js');
var fs = require('fs');

var dgram	= require('dgram'),
	packet	= require('coap-packet'),
	parse	= packet.parse,
	generate = packet.generate,
	payload	= new Buffer(''),
	message	= generate({ payload: payload });
var controller = dgram.createSocket("udp6");

/* database 연결 초기화 */
var mysql = require('mysql');
var dbConnection = mysql.createConnection({
	host: "13.209.8.64",
	user: "entry_manager",
	password: "1234",
	database: "embeded_class"
});

/* mailer 설정 */
var nodemailer = require('nodemailer');
var transporter = nodemailer.createTransport({
	service: 'Gmail',
	auth: {
		user: 'myid',
		pass: 'mypass'
	}
});

var mailOptions = {
	from: 'myid',
	to: 'userid',
	subject: '무인택배시스템) *경고* 인증되지 않은 유저가 지속적으로 접근을 시도합니다.',
	text: '아래 서버로그를 확인해주세요!\n'
};

/* web3를 geth client와 연결 */
var Web3 = require('web3');
var web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
/* blockchain 내의 contract 주소 */
var contractInstanceAddr = "0xedf024248419e6a52c2457ffc7e72709d7b8d882";
/* 이미 생성되어 blockchain에 올라가 있는 인스턴스를 할당 */
var paperInstance = web3.eth.contract(vars.abi).at(contractInstanceAddr);

var invalidAccess = 0;

/* CoAP을 타고 온 message 수신 */
controller.on("message", function(msg, rinfo) {
	msg = parse(msg).payload.toString();
	// console.log("controller got : " + msg + " from " + rinfo.address + ":" + rinfo.port);
	console.log("*** 모트로부터 지문 정보를 수신하였습니다. ***");

	/* transaction 발생시키기 이전 계정의 락을 풀어준다 */
	web3.personal.unlockAccount(web3.eth.coinbase, "bhun");

	/* database로부터 지문 정보를 불러온 뒤, 대조한다 */
	var sql = "SELECT * FROM infos WHERE finger_print = '" + msg + "'";

	// var sql = "SELECT * FROM infos WHERE finger_print = '0'";
	dbConnection.query(sql, function(err, row) {

		var inTime = new Date().toString();
		if(err) throw err;
		// console.log(row);

		
		/* 지문 정보가 존재한다면 해당 지문에 해당하는 인물의 정보를 timestamp와 함께 transaction에 담아 발생시킨다 */
		if(row.length > 0) {
			/* 인증되지 않은 유저의 접근 회수를 갱신한다. */
			invalidAccess = 0;

			/* transaction receipt를 참조하여 블록정보를 저장할 JSON object */
			var infoLog = {
				blockHash: "",
				blockNumber: "",
				transactionHash: ""
			}

			/* database에서 불러온 정보들을 transaction에 담기 위해서 변수에 임시로 저장 */
			var name = row[0].name,
			address = row[0].address,
			phone = row[0].phone;

			var transactionHash =
			paperInstance.setUserInformation.sendTransaction(name, address, phone, inTime, {from:web3.eth.coinbase, gas: '200000'});

			/* transaction receipt의 block 정보를 통하여 blockchain에 등재되었는지 50밀리세컨드 단위로 확인한다 */
			var interval = setInterval(function() {
				var receipt = web3.eth.getTransactionReceipt(transactionHash);
				if(receipt != null) {
					infoLog.blockHash = receipt.blockHash;
					infoLog.blockNumber = receipt.blockNumber;
					infoLog.transactionHash = receipt.transactionHash;

					/* blockchain에 입주자 정보가 등재되었다면 interval 함수를 중지시킨다 */
					if(infoLog.blockHash.length > 0) {
						var log = "\n****************** 블록체인에 출입정보가 정상적으로 기록되었습니다 ******************\n" +
						"*                                                                                   *\n" +
						"* 시간     : " + inTime + "                                *\n" +
						"* 주소     : " + address + "                                                           *\n" +
						"* 연락처   : " + phone + "                                                          *\n" +
						"* 블록번호 : " + infoLog.blockNumber + "                                                                   *\n" +
						"* 블록해쉬 : " + infoLog.blockHash + "     *\n" +
						"* 트랜잭션해쉬 : " + infoLog.transactionHash + " *\n" +
						"*                                                                                   *\n" +
						"*************************************************************************************\n";
						console.log(log);
						fs.appendFile('log.txt', log, function(err) { if(err) throw err; });

						sql = "INSERT INTO logs (name, address, phone, timestamp, transaction_hash) " +
						"VALUES('" + name + "','" + address + "','" + phone + "','" + inTime + "','" + infoLog.transactionHash + "')"
						dbConnection.query(sql);
						sql = "SELECT * FROM logs"
						dbConnection.query(sql, function(err, row) {
							// console.log("row : ", row);
						});
						clearInterval(interval);
					}
				}
			}, 50);
			/* 지문 정보가 존재하지 않는다면 존재하지 않음을 알리고 아무일도 발생하지 않는다 */
		} else {
			invalidAccess++;
			log = "\n인증되지 않은 유저가 잠금 해제를 시도하였습니다.\n" +
			"시간 : " + inTime + "\n";
			console.log(log);
			fs.appendFile('log.txt', log, 'utf-8', function(err) { if(err) throw err; });

			if(invalidAccess >= 3) {
				invalidAccess = 0;
				fs.readFile('log.txt', 'utf-8', function(err, data) {
					mailOptions.text += data;
					transporter.sendMail(mailOptions, function(err, info){
						if (err) {
							console.log(err);
						} else {
							console.log('경고 메일 발송 : ' + info.response);
						}
					}); 	
				});
			}
		}
	});

	// dbConnection.end();
});

/* CoAP 메세지 리스닝 */
controller.on("listening", function() {
	var address = controller.address();
	console.log("controller listening " + address.address +
		":" + address.port);
});

controller.bind(PORT);
