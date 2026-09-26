import { redirect } from 'next/navigation';

export default function CognitivePage(){
  redirect('/?cognitive=all');
}
