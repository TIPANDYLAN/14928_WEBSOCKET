package com.achigriveratipan.chatsockets.controller;

import com.achigriveratipan.chatsockets.model.GroupMessage;
import com.achigriveratipan.chatsockets.model.Message;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.HashSet;
import java.util.Set;

@Controller
public class ChatController {

    @Autowired
    private SimpMessagingTemplate simpMessagingTemplate;

    private Set<String> connectedUsers;

    public ChatController() {
        connectedUsers = new HashSet<>();
    }

    @MessageMapping("/message")
    @SendTo("/chatroom/public")
    public Message receivePublicMessage(@Payload Message message) {
        return message;
    }

    @MessageMapping("/private-message")
    public void receivePrivateMessage(@Payload Message message) {
        simpMessagingTemplate.convertAndSendToUser(message.getReceiverName(), "/private", message);
    }

    @MessageMapping("/join")
    public void join(@Payload Message message) {
        connectedUsers.add(message.getSenderName());
        simpMessagingTemplate.convertAndSend("/chatroom/users", connectedUsers);
    }

    @MessageMapping("/leave")
    public void leave(@Payload Message message) {
        connectedUsers.remove(message.getSenderName());
        simpMessagingTemplate.convertAndSend("/chatroom/users", connectedUsers);
    }

    @MessageMapping("/join-group")
    public void joinGroup(@Payload GroupMessage groupMessage) {
        // Send a message to all users in the group
        simpMessagingTemplate.convertAndSend("/topic/" + groupMessage.getGroupName(), groupMessage);
    }
}
