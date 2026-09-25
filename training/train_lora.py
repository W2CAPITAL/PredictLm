import argparse
import json
from pathlib import Path

from datasets import Dataset
from transformers import AutoModelForCausalLM, AutoTokenizer, TrainingArguments
from peft import LoraConfig
from trl import SFTTrainer


def read_jsonl(path: Path):
    rows=[]
    for line in path.read_text(encoding='utf-8').splitlines():
        line=line.strip()
        if not line:
            continue
        row=json.loads(line)
        messages=row.get('messages')
        if isinstance(messages,list) and messages:
            rows.append({'messages':messages,'source':row.get('source','curated')})
    if not rows:
        raise SystemExit(f'No valid training rows in {path}')
    return rows


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--model',default='Qwen/Qwen2.5-0.5B-Instruct')
    parser.add_argument('--data',default='training/seed-sft.jsonl')
    parser.add_argument('--out',default='training/out/predictlm-lora')
    parser.add_argument('--epochs',type=float,default=3.0)
    args=parser.parse_args()

    tokenizer=AutoTokenizer.from_pretrained(args.model,trust_remote_code=True)
    model=AutoModelForCausalLM.from_pretrained(
        args.model,
        torch_dtype='auto',
        device_map='auto',
        trust_remote_code=True,
    )

    raw=read_jsonl(Path(args.data))
    def format_row(row):
        return {
            'text':tokenizer.apply_chat_template(
                row['messages'],
                tokenize=False,
                add_generation_prompt=False,
            )
        }

    ds=Dataset.from_list(raw).map(format_row,remove_columns=['messages','source'])
    lora=LoraConfig(
        r=16,
        lora_alpha=32,
        lora_dropout=0.05,
        bias='none',
        task_type='CAUSAL_LM',
        target_modules=['q_proj','k_proj','v_proj','o_proj','gate_proj','up_proj','down_proj'],
    )
    training=TrainingArguments(
        output_dir=args.out,
        num_train_epochs=args.epochs,
        per_device_train_batch_size=1,
        gradient_accumulation_steps=8,
        learning_rate=1e-4,
        logging_steps=5,
        save_strategy='epoch',
        bf16=True,
        report_to='none',
    )
    trainer=SFTTrainer(
        model=model,
        tokenizer=tokenizer,
        train_dataset=ds,
        peft_config=lora,
        args=training,
        dataset_text_field='text',
        max_seq_length=2048,
    )
    trainer.train()
    trainer.save_model(args.out)
    tokenizer.save_pretrained(args.out)
    print(args.out)


if __name__=='__main__':
    main()
