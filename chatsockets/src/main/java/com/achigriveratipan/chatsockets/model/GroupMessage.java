package com.achigriveratipan.chatsockets.model;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString

public class GroupMessage {
    private String senderName;
    private String groupName;
    private String message;
    private String status;
}
