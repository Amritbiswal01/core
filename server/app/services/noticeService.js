/*
 Copyright [2016] [Relevance Lab]

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */


var logger = require('_pr/logger')(module);
var noticeSchema = require('_pr/model/push-notice/push-notice.js');
var address,socketClient;

var noticeService = module.exports = {

    init:function init(io,address){
        address = address.address+address.port;
        socketClient = require('socket.io-client')('http://'+address+'/notify');
        var nsp = io.of('/notify');
        nsp.on('connect',function(socket){
            socket.on('join', function(roomData) {
                socket.join(roomData);
            });
            socket.on('onLoad',function(userid){
                noticeSchema.getAllnotices(userid,function(err,data){
                    if(err){
                        logger.error(err);  
                    }else {
                        nsp.in('client-'+userid).emit('noticelist',{data:data,count:data.length});
                    }
                });
            });
            socket.in('server').on('notice',function(data){
                nsp.in('client-'+data.data.user_id).emit('notice',data);
            })
            socket.in('server').on('update',function(data){
                nsp.in('client-'+data.data.user_id).emit('update',data);
            })
            socket.on('noticeack',function(userid){
                noticeSchema.deleteNotice(userid,function(err,data){
                    if(err)
                    logger.error(err);  
                })
            })
            socket.on('disconnect',function(){
                socket.on('leave',function(roomData){
                    socket.leave(roomData);
                })
            })
        });
    },
    notice:function notice(userid,message,severity,callback){
        socketClient.on('connect',function(){
            socketClient.emit('join','server');
            logger.debug('notice server room created.');
        }); 
        var noticeDetails = {
            user_id:userid,
            'message.title':message.title,
            'message.body':message.body,
            severity: severity,
            createdOn:new Date().getTime()
        }
        noticeSchema.createNew(noticeDetails,function(err,data){
            if(err){
                logger.error(err);
                var error = new Error('Internal server error');
                error.status = 500;
                callback(error,null);
            }else {
                socketClient.emit('notice',{data})
                callback(null,{msg:'successfully noticed'});
            }
        })
        socketClient.on('disconnect',function(){
            socketClient.emit('leave','server');
        })
    },
    updater:function updater(userid,dataType,updateData,callback){
        socketClient.on('connect',function(){
            socketClient.emit('join','server');
            logger.debug('update server room created.');
        });
        socketClient.emit('update',{user_id:userid,dataType:dataType,updateData:updateData});
        callback(null,{msg:'successfully updated'});
        socketClient.on('disconnect',function(){
            socketClient.emit('leave','server');
        })
    }
    // test:function test(){
    //     socketClient.on('connect',function(){
    //         socketClient.emit('join','client-2');
    //     });
    //     socketClient.emit('onLoad',2);
    //     socketClient.on('noticelist',function(data){
    //         console.log(data);
    //     })
    //     socketClient.on('notice',function(data){
    //         console.log(data);
    //     })
    //     socketClient.on('update',function(data){
    //         console.log(data);
    //     })
    //     socketClient.on('disconnect',function(){
    //         socketClient.emit('leave','client-2');
    //     })
    // }
}


