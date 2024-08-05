import React, { useEffect, useState } from 'react';
import { over } from 'stompjs';
import SockJS from 'sockjs-client';

var stompClient = null;

const ChatRoom = () => {
    const [privateChats, setPrivateChats] = useState(new Map());
    const [publicChats, setPublicChats] = useState([]);
    const [connectedUsers, setConnectedUsers] = useState([]);
    const [tab, setTab] = useState("CHATROOM");
    const [lastMessages, setLastMessages] = useState(new Map());
    const [userData, setUserData] = useState({
        username: '',
        receivername: '',
        connected: false,
        message: ''
    });

    useEffect(() => {
        console.log(userData);
    }, [userData]);

    const connect = () => {
        let Sock = new SockJS('http://localhost:8081/ws');
        stompClient = over(Sock);
        stompClient.connect({}, onConnected, onError);
    }

    const onConnected = () => {
        setUserData({ ...userData, "connected": true });
        stompClient.subscribe('/chatroom/public', onMessageReceived);
        stompClient.subscribe('/chatroom/users', onUsersUpdate);
        stompClient.subscribe('/user/' + userData.username + '/private', onPrivateMessage);
        userJoin();
    }

    const userJoin = () => {
        var chatMessage = {
            senderName: userData.username,
            status: "JOIN"
        };
        if (stompClient && stompClient.connected) {
            stompClient.send("/app/join", {}, JSON.stringify(chatMessage));
        }
    }

    const userLeave = () => {
        var chatMessage = {
            senderName: userData.username,
            status: "LEAVE"
        };
        if (stompClient && stompClient.connected) {
            stompClient.send("/app/leave", {}, JSON.stringify(chatMessage));
        }
    }

    const onUsersUpdate = (payload) => {
        var users = JSON.parse(payload.body);
        setConnectedUsers(users);
    }

    const onMessageReceived = (payload) => {
        var payloadData = JSON.parse(payload.body);
        switch (payloadData.status) {
            case "JOIN":
                if (!privateChats.get(payloadData.senderName) && payloadData.senderName !== userData.username) {
                    privateChats.set(payloadData.senderName, []);
                    setPrivateChats(new Map(privateChats));
                }
                break;
            case "MESSAGE":
                publicChats.push(payloadData);
                setPublicChats([...publicChats]);
                setLastMessages(prevLastMessages => {
                    prevLastMessages.set("CHATROOM", payloadData.message);
                    return new Map(prevLastMessages);
                });
                break;
            default:
                break;
        }
    };
    
    const onPrivateMessage = (payload) => {
        console.log(payload);
        var payloadData = JSON.parse(payload.body);
        if (privateChats.get(payloadData.senderName)) {
            privateChats.get(payloadData.senderName).push(payloadData);
            setPrivateChats(new Map(privateChats));
        } else {
            let list = [];
            list.push(payloadData);
            privateChats.set(payloadData.senderName, list);
            setPrivateChats(new Map(privateChats));
        }
        setLastMessages(prevLastMessages => {
            prevLastMessages.set(payloadData.senderName, payloadData.message);
            return new Map(prevLastMessages);
        });
    };
    
    

    const onError = (err) => {
        console.log(err);
    }

    const handleMessage = (event) => {
        const { value } = event.target;
        setUserData({ ...userData, "message": value });
    }

    const sendValue = () => {
        if (stompClient && stompClient.connected) {
            var chatMessage = {
                senderName: userData.username,
                message: userData.message,
                status: "MESSAGE"
            };
            console.log(chatMessage);
            stompClient.send("/app/message", {}, JSON.stringify(chatMessage));
            setUserData({ ...userData, "message": "" });
            
            setLastMessages(prevLastMessages => {
                prevLastMessages.set("CHATROOM", chatMessage.message);
                return new Map(prevLastMessages);
            });
        } else {
            console.log("stompClient not connected");
        }
    }
    
    const sendPrivateValue = () => {
        if (stompClient && stompClient.connected) {
            var chatMessage = {
                senderName: userData.username,
                receiverName: tab,
                message: userData.message,
                status: "MESSAGE"
            };
    
            if (userData.username !== tab) {
                const currentChat = privateChats.get(tab) || [];
                currentChat.push(chatMessage);
                privateChats.set(tab, currentChat);
                setPrivateChats(new Map(privateChats));
            }
            stompClient.send("/app/private-message", {}, JSON.stringify(chatMessage));
            setUserData({ ...userData, "message": "" });
    
            setLastMessages(prevLastMessages => {
                prevLastMessages.set(chatMessage.receiverName, chatMessage.message);
                return new Map(prevLastMessages);
            });
        } else {
            console.log("stompClient not connected");
        }
    }
    

    const handleUsername = (event) => {
        const { value } = event.target;
        setUserData({ ...userData, "username": value });
    }

    const registerUser = () => {
        if (userData.username.trim() === "") {
            // No hacer nada si el nombre de usuario está vacío
            return;
        }
        connect();
    }

    useEffect(() => {
        window.addEventListener("beforeunload", userLeave);
        return () => {
            window.removeEventListener("beforeunload", userLeave);
            userLeave();
        };
    }, [userData.username]);

    useEffect(() => {
        if (tab !== "CHATROOM" && !connectedUsers.includes(tab)) {
            setTab("CHATROOM");
        }
    }, [connectedUsers]);

    const isMessageEmpty = () => {
        return userData.message.trim() === "";
    }

    const isUsernameEmpty = () => {
        return userData.username.trim() === "";
    }

    return (
        <div className="container">
            {userData.connected ? 
            <>
                <div className="header">WhatsEspe</div>
                <div className="chat-box">
                <div className="member-list">
                    <h1 className='section-title'>Chats</h1>
                    <ul>
                        <li onClick={() => { setTab("CHATROOM") }} className={`member ${tab === "CHATROOM" && "active"}`}>
                            <p>Chatroom</p>
                            <p className="last-message">{lastMessages.get("CHATROOM")}</p>
                        </li>
                        {connectedUsers
                            .filter(name => name !== userData.username)
                            .map((name, index) => (
                                <li onClick={() => { setTab(name) }} className={`member ${tab === name && "active"}`} key={index}>
                                    <p>{name}</p>
                                    <p className="last-message">{lastMessages.get(name)}</p>
                                </li>
                            ))}
                    </ul>
                </div>
                    {tab === "CHATROOM" && <div className="chat-content">
                        <h1 className='section-title'>Chatroom</h1>
                        <ul className="chat-messages">
                            {publicChats.map((chat, index) => (
                                <li className={`message ${chat.senderName === userData.username && "self"}`} key={index}>
                                    {chat.senderName !== userData.username && <div className="avatar">{chat.senderName.charAt(0)}</div>}
                                    <div className="message-data">{chat.message}</div>
                                    {chat.senderName === userData.username && <div className="avatar self">{chat.senderName.charAt(0)}</div>}
                                </li>
                            ))}
                        </ul>

                        <div className="send-message">
                            <input type="text" className="input-message" placeholder="Escribir un mensaje.." value={userData.message} onChange={handleMessage} />
                            <button type="button" className="send-button" onClick={sendValue} disabled={isMessageEmpty()}>Enviar</button>
                        </div>
                    </div>}
                    {tab !== "CHATROOM" && <div className="chat-content">
                        <h1 className='section-title'>{tab}</h1>
                        <ul className="chat-messages">
                            {(privateChats.get(tab) || []).map((chat, index) => (
                                <li className={`message ${chat.senderName === userData.username && "self"}`} key={index}>
                                    {chat.senderName !== userData.username && <div className="avatar">{chat.senderName.charAt(0)}</div>}
                                    <div className="message-data">{chat.message}</div>
                                    {chat.senderName === userData.username && <div className="avatar self">{chat.senderName.charAt(0)}</div>}
                                </li>
                            ))}
                        </ul>

                        <div className="send-message">
                            <input type="text" className="input-message" placeholder="Escribir un mensaje.." value={userData.message} onChange={handleMessage} />
                            <button type="button" className="send-button" onClick={sendPrivateValue} disabled={isMessageEmpty()}>Enviar</button>
                        </div>
                    </div>}
                </div></>
                :
                <form className="register">
                    <input
                        id="user-name"
                        placeholder="Ingrese un nombre"
                        name="userName"
                        value={userData.username}
                        onChange={handleUsername}
                        margin="normal"
                    />
                    <button className='register-button' type="button" onClick={registerUser} disabled={isUsernameEmpty()}>
                        Ingresar
                    </button>
                </form>}
        </div>
    )
}

export default ChatRoom;
