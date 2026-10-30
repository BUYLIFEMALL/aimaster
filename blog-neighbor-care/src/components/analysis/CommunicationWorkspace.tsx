'use client';
import {ExecutionControl} from './ExecutionControl';import {WorkRecords} from './WorkRecords';
import {useState} from 'react';import {PostPlanner,type PreparedPost} from './PostPlanner';import {MessageStudio} from './MessageStudio';
export function CommunicationWorkspace(){const [post,setPost]=useState<PreparedPost|null>(null);return <><ExecutionControl/><PostPlanner onPick={setPost}/><MessageStudio preparedPost={post}/><WorkRecords/></>;}
