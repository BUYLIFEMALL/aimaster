'use client';
import {WorkRecords} from './WorkRecords';
import {useState} from 'react';import {PostPlanner,type PreparedPost} from './PostPlanner';import {MessageStudio} from './MessageStudio';
import {FeedMonitor} from './FeedMonitor';
// v1.16: 「회원 실행 허용·일일 상한」은 설정 한 곳으로 옮겼다(중복 칸 정리).
export function CommunicationWorkspace(){const [post,setPost]=useState<PreparedPost|null>(null);return <><FeedMonitor/><PostPlanner onPick={setPost}/><MessageStudio preparedPost={post}/><WorkRecords/></>;}
