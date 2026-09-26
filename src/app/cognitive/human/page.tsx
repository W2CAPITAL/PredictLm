import { redirect } from 'next/navigation';

export default function HumanCognitivePage(){
  redirect('/?cognitive=all');
}
