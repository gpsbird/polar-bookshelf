import {AppPath} from '../../../electron/app_path/AppPath';
import {FilePaths} from '../../../util/FilePaths';
import {PDFImporter} from '../importers/PDFImporter';
import {PersistenceLayer} from '../../../datastore/PersistenceLayer';
import {Providers} from '../../../util/Providers';
import {Pagemarks} from '../../../metadata/Pagemarks';
import {Logger} from '../../../logger/Logger';
import {Tag} from '../../../tags/Tag';

const log = Logger.create();

export class LoadExampleDocs {

    private readonly persistenceLayer: PersistenceLayer;

    private readonly pdfImporter: PDFImporter;

    constructor(persistenceLayer: PersistenceLayer) {
        this.persistenceLayer = persistenceLayer;

        this.pdfImporter
            = new PDFImporter(
                Providers.toInterface(
                    Providers.of(
                        this.persistenceLayer)));

    }

    public async load() {

        if (await this.hasDocs()) {
            // we're done as there already docs in the repo
            log.debug("Docs already exist");
            return;
        }

        // now load the files propery..
        await this.doDoc0();
        await this.doDoc1();
        await this.doDoc2();

    }

    private async doDoc0() {

        await this.doDoc(FilePaths.join('docs', 'examples', 'pdf', 'pub47492.pdf'), {
            title: "Efficient Live Expansion for Clos Data Center Networks",
            tags: {
                google: {id: "google", label: "google"},
                datacenters: {id: "datacenters", label: "datacenters"}
            },
            pagemarkEnd: 17
        });

    }

    private async doDoc1() {

        await this.doDoc(FilePaths.join('docs', 'examples', 'pdf', 'bigtable.pdf'), {
            title: "Bigtable: A Distributed Storage System for Structured Data",
            tags: {
                google: {id: "google", label: "google"},
                bigtable: {id: "bigtable", label: "bigtable"},
                compsci: {id: "compsci", label: "compsci"}
            },
            pagemarkEnd: 3
        });

    }

    private async doDoc2() {

        await this.doDoc(FilePaths.join('docs', 'examples', 'pdf', 'mapreduce.pdf'), {
            title: "MapReduce: Simplified Data Processing on Large Clusters",
            tags: {
                google: {id: "google", label: "google"},
                mapreduce: {id: "mapreduce", label: "mapreduce"},
                compsci: {id: "compsci", label: "compsci"}
            },
            pagemarkEnd: 6
        });

    }

    private async doDoc(relativePath: string, opts: DocOpts) {

        const importedFile =
            await this.doImport(relativePath);

        if (importedFile.isPresent()) {

            const docInfo = importedFile.get().docInfo;

            const docMeta = await this.persistenceLayer.getDocMeta(docInfo.fingerprint);

            if (docMeta) {
                docMeta.docInfo.title = opts.title;
                docMeta.docInfo.tags = opts.tags;

                if (opts.pagemarkEnd) {
                    Pagemarks.updatePagemarksForRange(docMeta, opts.pagemarkEnd);
                }

                log.info("Wrote to persistenceLayer: ", opts.title);

                await this.persistenceLayer.writeDocMeta(docMeta);
            }

        }

    }

    private async doImport(relativePath: string) {

        const appPath = AppPath.get();

        const path = FilePaths.join(appPath, relativePath);

        return await this.pdfImporter.importFile(path);

    }

    private async hasDocs() {
        const docMetaRefs = await this.persistenceLayer.getDocMetaRefs();

        return docMetaRefs.length !== 0;
    }

}

interface DocOpts {
    readonly title: string;
    readonly pagemarkEnd?: number;
    readonly tags?: {[id: string]: Tag};
}
