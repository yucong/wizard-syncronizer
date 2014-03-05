#!/usr/bin/env node

var Repo = require("../repo.js");
var API = require("../api.js");
var config = require("../config.js");
var fs = require("fs");
var package = require("../package.js");
var async=require('async');

var conf = config.loadConfig();

exports.sync = function(options, callback) {
	var widgetName = options.widgetName;
	var env = options.env;
	var comment = options.comment;
	var branch = options.branch;

	var info = "";

	if (!conf) {
		console.log("you must first login");
		return;
	}
	var user = conf.user;
	if (!user) {
		console.log("you must first login");
		return;
	}
	if (!widgetName) {
		console.log("you must specify the widget");
		return;
	}
	if (!env) {
		console.log("you must specify the env {alpha|beta|product}");
		return;
	}
	if (!comment) {
		console.log("you must enter the comment");
		return;
	}
	if (!branch) {
		console.log("you must specify a branch");
		return;
	}
	deleteTempDirectory();
	var tempDirectory = createTempDirectory();
	console.log("create temp directory: " + tempDirectory);
	var api = API.getAPI(env);


	async.waterfall([
		function loadWidgetExtInfo(cb) {
			api.loadWidgetExtInfo(widgetName, function(err, widgetExtInfo) {
				cb(err, widgetExtInfo);
			});
		},
		function cloneGitRepo(widgetExtInfo,cb) {
			var command = 'git clone ' + widgetExtInfo.gitURL + " -b " + branch + " " + tempDirectory;
			info += logAndReturn(command);
			require('child_process').exec(command, {}, function(err, stdout, stderr) {
				console.log(stdout);
				console.log(stderr);
				cb(err);
			})

		},
		function searchWidget(cb){
			var repo = new Repo(tempDirectory);
			repo.loadWidget(widgetName,function(err,widget){
				cb(err,widget);
			});
		},
		function commitWidget(widget,cb){
			info += logAndReturn("uploading widget: " + widgetName + "...");
			api.commit({
						widget: widget,
						comment: comment,
						clearCache: options.clearCache || true,
						appNames: options.appNames || "all",
					}, function(err) {
						cb(err);
					});
		}
	], function(err, result) {
		if(err){
			info += logAndReturn("sync error:" + err.message);
		}else{
			info += logAndReturn("upload " + widgetName + " success");
		}
		callback && callback(info);
	})

}

function logAndReturn(msg) {
	console.log(msg);
	return msg + "\n";
}

function createTempDirectory() {
	var path = config.getWizardHome() + "/temp";
	fs.mkdirSync(path);
	return path;
}

function deleteTempDirectory() {
	var path = config.getWizardHome() + "/temp";
	deleteFolderRecursive(path);
}

function  deleteFolderRecursive(path) {
	if (fs.existsSync(path)) {
		fs.readdirSync(path).forEach(function(file, index) {
			var curPath = path + "/" + file;
			if (fs.statSync(curPath).isDirectory()) { // recurse
				deleteFolderRecursive(curPath);
			} else { // delete file
				fs.unlinkSync(curPath);
			}
		});
		fs.rmdirSync(path);
	}
};