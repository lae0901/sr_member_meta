# sr_ibmi_common - functions used to access ibm i from vscode.

## source file functions
* const { errmsg } = await as400_addpfm( fileName, libName, mbrName, textDesc, srcType, options );
* const { errmsg } = await as400_chgpfm( fileName, libName, mbrName, textDesc, srcType )
* as400_srcfList(objName: string, libName: string) : Promise<{}[]>
* as400_compile( srcfName:string, srcfLib:string, srcmbr:string, iOptions) :
      Promise<{compMsg:string, compile:iCompileLine[], joblog:string[]}>
* const { errmsg } = await as400_rmvm( fileName, libName, mbrName, options )
* iSrcmbrLine[] = await as400_srcmbrLines( lib, file, srcmbr )
* iDspfd_mbrlist[] = await as400_srcmbrList( lib, file, srcmbr )

## utility functions
* langCode = langCode_setup( srcType )
* ext = srcType_toExt( srcType )
* langCode = ext_toLangCode( ext )

## ibm i ifs functions
* iIfsItem[] = await ibmi_ifs_getItems( dirPath, itemName, filter_itemType )
* {buf,errmsg} = await ibmi_ifs_getFileContents( filePath )

## meta functions
* {toPath, errmsg } = await srcmbr_filePath_rename( srcmbr_filePath, toFileName ) ;
* { memberMetaArr, orphanFilArr } = await memberMeta_readFolder( dirPath ) ;
* await memberMeta_assignProperty( srcmbr_filePath, procName, vlu );
* memberMeta_metaDirPath( dirPath ) ;

## interfaces
```
// -------------------------- iServerOptions -------------------------
// options passed to server REST API.
// serverUrl: url of the server.  http://192.168.1.170:10080
// numRows: max number of rows to return
// libl: library list when api runs on server
interface iServerOptions
{
  serverUrl?: string,
  numRows?: number,
  libl?: string,
  curlib?: string
}

interface iCompileLine
{
  SKIPBFR: string,
  SPACEB: string,
  LINE: string
}

export interface iSrcmbrLine
{
  SEQNBR: string,
  CHGDATE: string,
  TEXT: string
}

export interface iSrcfMirror
{
  ibmi_url?: string
  library: string;
  srcfile: string[];
  srctype: string[];
  members?: string[];

  mirror_hold?: boolean;

  // source file is the master. Files in the srcmbr folder are
  // removed if they do not exist as srcmbr in source file.
  srcf_is_master?: boolean;
}
```      

## publish instructions
* increment version number in package.json
* npm run build
* npm run test
* git add, commit, push to repo
* npm publish
* npm update in projects which use this package

## testing 
* npm run test
