function codeCompile(code){
    const code_lines=code.split(/\r\n/).map(line=>{
        const fixed_line=line.trim();
        //import fix
        if(fixed_line.indexOf('import ')==0){
            let [f_statement,attrs]=fixed_line.split(' with ').map(v=>v.trim());
            let statment=f_statement.split(' from ');
            if(statment.length==2){
                let [context,link]=statment;
                link=link.trim().replace(';','');
                let experss=context.replace('import ','').trim();
                if(experss.indexOf('* as ')==0){
                    experss=experss.replace('* as  ','').trim();
                    //import * as obj from 'link'; --> const obj=await importModule(link);
                }
                else if(experss[0]=='{' && experss[experss.length-1]=='}'){
                    //import {s,x,g} from 'link'; --> const {s,x,g}=await importModule(link);
                    //import {v as c} from 'link'; --> const {v:c}=await importModule(link);
                    experss=experss.replaceAll(' as ',':'); // _as_ --> :
                }
                else{
                    //import some from 'link'; --> const {default:some}=await importModule(link);
                    experss=`{default:${experss}}`;
                }
                return `const ${experss}=await importModule(${link}${attrs && attrs.length>0?`,${attrs.replace(';','')}`:''})`;
            }
        }
        return fixed_line;
    });

    return code_lines.filter(v=>v.length).join('\r\n');
}


export {codeCompile};